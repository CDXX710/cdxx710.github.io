import SelectionState from "../state/selection-state.js"
import Markers from "../markers/markers.js"
import MapCore from "../map/map-core.js"
import EventBus from "../event-bus.js"
import ResultsViewState from "../state/results-view-state.js"
import ExportDialog from "./export-dialog.js"
import buildResultRow from "./results-row.js"

// ─────────────────────────────────────────────────────────────
// SelectionResults — the selected-records list panel: rendering
// rows, keeping the title/count in sync, and keeping selected
// markers visually highlighted. Sorting/filtering logic lives in
// ResultsViewState; the export dialog lives in ExportDialog.
// ─────────────────────────────────────────────────────────────
const SelectionResults = (() => {
	let listEl, countEl, sortInputEl, collapsible, titleBtn, titleLabelEl

	function isolateFromMap(el) {
		L.DomEvent.disableScrollPropagation(el)
		L.DomEvent.disableClickPropagation(el)
	}

	// No header/body params here (unlike Legend/AnalyticsPanel) — this
	// panel's header markup lives in the external HTML, not built here,
	// and its collapse transition is already CSS-driven off the
	// `collapsedClass` toggle alone; nothing here ever measures or writes
	// height from JS.
	function createCollapsible({panelEl, collapseBtn, collapsedClass = "is-collapsed", expandLabel, collapseLabel}) {
		function setCollapsed(collapsed) {
			panelEl.classList.toggle(collapsedClass, collapsed)
			collapseBtn.setAttribute("aria-expanded", String(!collapsed))
			collapseBtn.setAttribute("aria-label", collapsed ? expandLabel : collapseLabel)
		}
		function isCollapsed() {
			return panelEl.classList.contains(collapsedClass)
		}
		return {setCollapsed, isCollapsed}
	}

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

	function render() {
		updateTitle()
		const indices = ResultsViewState.activeIndices()
		const orderedIndices = indices.length === 0 ? [] : ResultsViewState.sortedIndices(currentSortKey())
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
		else if (SelectionState.size() === 0) collapsible.setCollapsed(true)
	}

	function init() {
		const panelEl = document.getElementById("results-panel")
		titleBtn = panelEl.querySelector(".results-panel__title")
		countEl = document.getElementById("results-panel__count")
		titleLabelEl = document.getElementById("results-panel__title-label")
		const collapseBtn = document.getElementById("results-panel__collapse-btn")
		sortInputEl = document.getElementById("results-panel__sort-value")
		listEl = document.getElementById("results-panel__list")

		isolateFromMap(panelEl)
		collapsible = createCollapsible({panelEl, collapseBtn, expandLabel: "Expand selection panel", collapseLabel: "Collapse selection panel"})

		document.getElementById("results-panel__clear-btn").addEventListener("click", () => SelectionState.clear())
		document.getElementById("results-panel__select-all-btn").addEventListener("click", ResultsViewState.selectAll)
		document.getElementById("results-panel__export-btn").addEventListener("click", ExportDialog.open)
		collapseBtn.addEventListener("click", () => collapsible.setCollapsed(!collapsible.isCollapsed()))
		titleBtn.addEventListener("click", toggleMode)
		collapsible.setCollapsed(false)

		let previousCount = 0
		EventBus.on("selection:changed", () => {
			highlightSelectedMarkers()
			if (ResultsViewState.isShowingAllInBbox()) return
			render()
			const count = SelectionState.size()
			if (count === 0) collapsible.setCollapsed(true)
			else if (previousCount === 0) collapsible.setCollapsed(false)
			previousCount = count
		})
		EventBus.on("selection:toolUsed", () => {
			if (ResultsViewState.isShowingAllInBbox()) {
				ResultsViewState.setShowAllInBbox(false)
				render()
			}
			if (SelectionState.size() > 0) collapsible.setCollapsed(false)
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
				collapsible.setCollapsed(false)
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
