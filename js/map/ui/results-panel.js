import SelectionState from "../state/selection-state.js"
import Markers from "../markers/markers.js"
import MapCore from "../map/map-core.js"
import EventBus from "../event-bus.js"
import ResultsViewState from "../state/results-view-state.js"
import ExportDialog from "./export-dialog.js"
import buildResultRow from "./results-row.js"
import {isolateFromMap, createCollapsible, isNarrowViewport} from "./panel-behaviors.js"

// ─────────────────────────────────────────────────────────────
// SelectionResults — the selected-records list panel: rendering
// rows, keeping the title/count in sync, and keeping selected
// markers visually highlighted. Sorting/filtering logic lives in
// ResultsViewState; the export dialog lives in ExportDialog.
// ─────────────────────────────────────────────────────────────
// Static onboarding guide shown in the list area when there's no selection
// yet. Kept as data so content can be edited without touching layout code.
// `paragraphs` render as separate lines inside a single blockquote;
// `shortcuts` render as a compact key/action legend instead.
const GUIDE_SECTIONS = [
	{
		heading: "Start by drawing",
		paragraphs: ["Use any drawing tool (rectangle, circle, lasso, polygon or object) to select features within an area."]
	},
	{
		heading: "Build complex selections",
		paragraphs: ["Draw a second shape to replace your existing selection.", "Use Union, Subtract or Intersect to control the shapes overlap behaviour."]
	},
	{
		heading: "Keyboard shortcuts",
		shortcuts: [
			{key: "Shift", action: "Add"},
			{key: "Alt", action: "Subtract"},
			{key: "Ctrl", action: "Intersect"}
		]
	},
	{
		heading: "Tip",
		paragraphs: ["Some options only appear when certain selection tools are active."]
	}
]

// Words in guide paragraphs that are candidates for a future hover/tooltip
// treatment (e.g. an Illustrator-style video preview per tool). Wrapping
// them now in a tagged span costs nothing and means that feature can be
// added later purely by attaching a listener to `[data-term]` — no changes
// needed here.
const GUIDE_TERMS = ["rectangle", "circle", "lasso", "polygon", "object", "union", "subtract", "intersect"]
const GUIDE_TERMS_RE = new RegExp(`\\b(${GUIDE_TERMS.join("|")})\\b`, "gi")

function markGuideTerms(text) {
	const frag = document.createDocumentFragment()
	let lastIndex = 0
	text.replace(GUIDE_TERMS_RE, (match, _term, offset) => {
		if (offset > lastIndex) frag.appendChild(document.createTextNode(text.slice(lastIndex, offset)))
		const span = document.createElement("span")
		span.className = "guide-term"
		span.dataset.term = match.toLowerCase()
		span.textContent = match
		frag.appendChild(span)
		lastIndex = offset + match.length
		return match
	})
	if (lastIndex < text.length) frag.appendChild(document.createTextNode(text.slice(lastIndex)))
	return frag
}

function buildGuideEl() {
	const guideEl = document.createElement("div")
	guideEl.className = "results-panel__guide"

	GUIDE_SECTIONS.forEach(({heading, paragraphs, shortcuts}) => {
		const section = document.createElement("section")
		section.className = "results-panel__guide-section"

		const h = document.createElement("h4")
		h.textContent = heading
		section.appendChild(h)

		const quote = document.createElement("blockquote")

		if (shortcuts) {
			const p = document.createElement("p")
			p.className = "results-panel__guide-shortcuts"
			shortcuts.forEach(({key, action}, i) => {
				if (i > 0) p.appendChild(document.createTextNode(" · "))
				const kbd = document.createElement("kbd")
				kbd.textContent = key
				p.appendChild(kbd)
				p.appendChild(document.createTextNode(` = ${action}`))
			})
			quote.appendChild(p)
		} else {
			paragraphs.forEach(text => {
				const p = document.createElement("p")
				p.appendChild(markGuideTerms(text))
				quote.appendChild(p)
			})
		}

		section.appendChild(quote)

		guideEl.appendChild(section)
	})

	return guideEl
}

const SelectionResults = (() => {
	let panelEl, listEl, countEl, sortInputEl, collapsible, titleBtn, titleLabelEl, emptyStateEl

	function currentSortKey() {
		return sortInputEl.value
	}

	function highlightSelectedMarkers() {
		Markers.all().forEach(marker => {
			const isSelected = SelectionState.has(Markers.featureIndex(marker))
			const iconEl = marker.getElement?.() ?? marker._icon
			iconEl?.classList.toggle("is-selected-marker", isSelected)
		})
	}

	function updateTitle() {
		const showAllInBbox = ResultsViewState.isShowingAllInBbox()
		countEl.textContent = String(showAllInBbox ? ResultsViewState.recordsInViewCount() : SelectionState.size())
		titleLabelEl.textContent = showAllInBbox ? "Visible:" : "Selection:"
		titleBtn.setAttribute("aria-pressed", String(showAllInBbox))
		countEl.classList.toggle("visible", showAllInBbox)
		countEl.classList.toggle("selection", !showAllInBbox)
	}

	let rowByIndex = new Map()

	// Two empty-state messages exist in the DOM at once (the guide and the
	// bbox message); which one is visible is decided by CSS off these two
	// classes, so this function never touches text content or elements.
	function updateEmptyState(isEmpty) {
		panelEl.classList.toggle("empty-state", isEmpty)
		if (!isEmpty) return
		panelEl.classList.toggle("empty-state--bbox", ResultsViewState.isShowingAllInBbox())
	}

	function render() {
		updateTitle()
		const indices = ResultsViewState.activeIndices()
		const orderedIndices = indices.length === 0 ? [] : ResultsViewState.sortedIndices(currentSortKey())
		updateEmptyState(orderedIndices.length === 0)
		const nextIndexSet = new Set(orderedIndices)

		// Remove rows for indices no longer present.
		rowByIndex.forEach((row, index) => {
			if (!nextIndexSet.has(index)) {
				row.remove()
				rowByIndex.delete(index)
			}
		})

		// Walk the desired order, reusing existing rows and only moving/creating
		// what's actually out of place — no full teardown/rebuild.
		let cursor = listEl.firstChild
		orderedIndices.forEach(index => {
			let row = rowByIndex.get(index)
			if (!row) {
				row = buildResultRow(index)
				rowByIndex.set(index, row)
			}
			if (row !== cursor) listEl.insertBefore(row, cursor)
			cursor = row.nextSibling
		})
	}

	function toggleMode() {
		const showAllInBbox = ResultsViewState.toggleShowAllInBbox()
		render()
		if (showAllInBbox) collapsible.setCollapsed(false)
		else if (SelectionState.size() === 0 && !isNarrowViewport()) collapsible.setCollapsed(false)
	}

	function init() {
		panelEl = document.getElementById("results-panel")
		titleBtn = panelEl.querySelector(".results-panel__title")
		countEl = document.getElementById("results-panel__count")
		titleLabelEl = document.getElementById("results-panel__title-label")
		const collapseBtn = document.getElementById("results-panel__collapse-btn")
		sortInputEl = document.getElementById("results-panel__sort-value")
		listEl = document.getElementById("results-panel__list")

		const dividerEl = document.createElement("div")
		dividerEl.className = "divider"
		dividerEl.setAttribute("role", "separator")
		listEl.parentNode.insertBefore(dividerEl, listEl)

		emptyStateEl = document.createElement("div")
		emptyStateEl.id = "results-panel__empty-state"
		emptyStateEl.className = "results-panel__empty-state"
		emptyStateEl.appendChild(buildGuideEl())
		const bboxMsgEl = document.createElement("p")
		bboxMsgEl.className = "results-panel__empty-message"
		bboxMsgEl.textContent = "No records in the current map view."
		emptyStateEl.appendChild(bboxMsgEl)
		listEl.parentNode.insertBefore(emptyStateEl, listEl.nextSibling)

		isolateFromMap(panelEl)
		collapsible = createCollapsible({panelEl, collapseBtn, expandLabel: "Expand selection panel", collapseLabel: "Collapse selection panel", name: "results"})

		document.getElementById("results-panel__clear-btn").addEventListener("click", () => SelectionState.clear())
		document.getElementById("results-panel__select-all-btn").addEventListener("click", ResultsViewState.selectAll)
		document.getElementById("results-panel__export-btn").addEventListener("click", ExportDialog.open)
		collapseBtn.addEventListener("click", () => collapsible.setCollapsed(!collapsible.isCollapsed()))
		titleBtn.addEventListener("click", toggleMode)
		// Starts expanded on wider viewports; starts collapsed by default on
		// narrow/mobile viewports instead.
		collapsible.setCollapsed(isNarrowViewport())
		// Desktop-only: the legend and results panels can overlap when both
		// are expanded, so collapse this one whenever legend expands.
		EventBus.on("panel:collapseChanged", ({name, collapsed}) => {
			if (name === "legend" && !collapsed && !isNarrowViewport()) collapsible.setCollapsed(true)
		})

		let previousCount = 0
		EventBus.on("selection:changed", () => {
			highlightSelectedMarkers()
			if (ResultsViewState.isShowingAllInBbox()) return
			render()
			const count = SelectionState.size()
			if (!isNarrowViewport()) {
				if (count === 0) collapsible.setCollapsed(false)
			}
			previousCount = count
		})
		let hasArmedOnce = false
		EventBus.on("selection:toolArmed", ({shape}) => {
			if (!shape || hasArmedOnce) return
			hasArmedOnce = true
			if (ResultsViewState.isShowingAllInBbox()) {
				ResultsViewState.setShowAllInBbox(false)
				render()
			}
			collapsible.setCollapsed(false)
		})
		EventBus.on("selection:toolUsed", () => {
			if (ResultsViewState.isShowingAllInBbox()) {
				ResultsViewState.setShowAllInBbox(false)
				render()
			}
			if (SelectionState.size() > 0 && !isNarrowViewport()) collapsible.setCollapsed(false)
		})
		EventBus.on("search:queryChanged", hasQuery => {
			if (hasQuery) {
				if (ResultsViewState.isShowingAllInBbox()) {
					ResultsViewState.setShowAllInBbox(false)
					render()
				}
			} else if (!ResultsViewState.isShowingAllInBbox()) {
				ResultsViewState.setShowAllInBbox(true)
				render()
				if (!isNarrowViewport()) collapsible.setCollapsed(false)
			}
		})
		EventBus.on("sort:changed", render)
		EventBus.on("analytics:recordsInViewChanged", count => {
			ResultsViewState.setRecordsInView(count)
			if (ResultsViewState.isShowingAllInBbox()) updateTitle()
		})
		MapCore.map.on("moveend", () => {
			if (ResultsViewState.isShowingAllInBbox()) render()
		})

		render()
	}

	function refresh() {
		render()
	}

	return {init, refresh}
})()

export default SelectionResults
