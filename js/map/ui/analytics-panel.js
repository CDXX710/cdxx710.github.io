import ArchiveData from "../data/archive-data.js"
import MapCore from "../map/map-core.js"
import SelectionState from "../state/selection-state.js"
import FilterState from "../state/filter-state.js"
import ViewportQuery from "../state/viewport-query.js"
import GeoIndex from "../data/geo-index.js"
import Theme from "../state/theme.js"
import Utils from "../utils.js"
import TimeSlider from "./time-slider-footer.js"
import EventBus from "../event-bus.js"

// ─────────────────────────────────────────────────────────────
// AnalyticsPanel — the "Research Summary" panel: always reflects the
// current map viewport, active filters, and selection (a selection —
// including search hits — narrows the summary to just those records;
// with nothing selected it summarises whatever is visible in the
// current viewport).
// ─────────────────────────────────────────────────────────────
const AnalyticsPanel = (() => {
	const allYears = ArchiveData.features.map(f => f.properties.time)
	const dataMinYear = Math.min(...allYears)
	const dataMaxYear = Math.max(...allYears)
	const decadeOf = year => Math.floor(year / 10) * 10
	const decades = []
	for (let d = decadeOf(dataMinYear); d <= decadeOf(dataMaxYear); d += 10) decades.push(d)

	let bodyEl, recordsEl, islandsEl, timelineEl, categoriesEl, authorTypesEl, collapsible
	let recordsInView = 0

	function isolateFromMap(el) {
		L.DomEvent.disableScrollPropagation(el)
		L.DomEvent.disableClickPropagation(el)
	}

	const collapseChevronSvg = Utils.html`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="2,9 7,4 12,9" /></svg>`

	// Builds a "<title> ...... <collapse button>" header row.
	function buildHeader({title, collapseLabel}) {
		const headerEl = Utils.el("div", {className: "analytics-panel__header"})
		if (title) headerEl.appendChild(Utils.el("span", {className: "analytics-panel__title", text: title}))
		const collapseBtn = Utils.el("button", {
			className: "collapse-btn analytics-panel__collapse-btn",
			"aria-label": collapseLabel,
			"aria-expanded": "false",
			html: collapseChevronSvg
		})
		headerEl.appendChild(collapseBtn)
		return {headerEl, collapseBtn}
	}

	// Collapse/expand only toggles classes + aria state; the header divider
	// lives statically inside `collapseWrap` (see init()) and is hidden for
	// free when the CSS collapse transition shrinks the wrapper to nothing.
	function createCollapsible({panelEl, collapseBtn, bodyEl, collapsedClass = "is-collapsed", expandLabel, collapseLabel}) {
		function setCollapsed(collapsed) {
			panelEl.classList.toggle(collapsedClass, collapsed)
			bodyEl.dataset.collapsed = String(collapsed)
			collapseBtn.setAttribute("aria-expanded", String(!collapsed))
			collapseBtn.setAttribute("aria-label", collapsed ? expandLabel : collapseLabel)
		}
		function isCollapsed() {
			return panelEl.classList.contains(collapsedClass)
		}
		return {setCollapsed, isCollapsed}
	}

	function inViewIndices() {
		return ViewportQuery.featuresInView({respectFilters: "active"})
	}
	function currentScopeIndices() {
		return SelectionState.size() > 0 ? SelectionState.indices() : inViewIndices()
	}
	// The timeline needs to show the full decade-by-decade distribution
	// for context, even while a year filter is already narrowing the map
	// (otherwise every decade outside the active range would read as
	// zero, since those markers are hidden by the filter itself). It
	// still respects the viewport and the other (non-year) filters, and
	// still narrows to an explicit selection when one exists.
	function timelineScopeIndices() {
		if (SelectionState.size() > 0) return SelectionState.indices()
		return ViewportQuery.featuresInView({respectFilters: "ignoreYear"})
	}

	function topEntries(counts, total, lastKey) {
		const sorted = Object.entries(counts).sort((a, b) => {
			// The designated "other/unknown" bucket always sorts last,
			// regardless of its share of the total.
			if (a[0] === lastKey) return 1
			if (b[0] === lastKey) return -1
			return b[1] - a[1]
		})
		return sorted.map(([key, count]) => ({key, count, pct: total ? Math.round((count / total) * 100) : 0}))
	}
	function barRow({label, pct, count, color, onClick}) {
		const row = Utils.el("div", {className: "analytics-bar-row"})
		row.innerHTML = Utils.html`
			${color ? `<span class="analytics-bar-row__dot" style="background:${color}"></span>` : ""}
			<span class="analytics-bar-row__label" title="${label}">${label}</span>
			<span class="analytics-bar-row__track"><span class="analytics-bar-row__fill" style="width:${pct}%"></span></span>
			<span class="analytics-bar-row__value">${pct}%</span>`
		row.title = `${label}: ${count} record${count === 1 ? "" : "s"}`
		if (onClick) {
			row.classList.add("is-clickable")
			row.tabIndex = 0
			row.setAttribute("role", "button")
			row.addEventListener("click", onClick)
			row.addEventListener("keydown", evt => {
				if (evt.key === "Enter" || evt.key === " ") {
					evt.preventDefault()
					onClick(evt)
				}
			})
		}
		return row
	}

	function renderRecordsInView(scope) {
		const total = ArchiveData.features.length
		recordsInView = scope.length
		recordsEl.innerHTML = Utils.html`
			<div class="analytics-section__title">Records in view</div>
			<div class="analytics-hero">
				<span class="analytics-hero__count">${scope.length}</span>
				<span class="analytics-hero__total">/ ${total}</span>
			</div>
            `
		EventBus.emit("analytics:recordsInViewChanged", recordsInView)
	}

	function renderIslands(scope) {
		islandsEl.innerHTML = `<div class="analytics-section__title">Top islands</div>`
		if (!scope.length) {
			islandsEl.appendChild(Utils.el("div", {className: "analytics-empty", text: "No records in this view."}))
			return
		}
		const counts = {}
		scope.forEach(index => {
			const island = GeoIndex.islandFor(index)
			counts[island] = (counts[island] ?? 0) + 1
		})
		topEntries(counts, scope.length).forEach(({key, pct, count}) => {
			const bounds = GeoIndex.boundsForIsland(key)
			islandsEl.appendChild(barRow({label: key, pct, count, onClick: bounds ? () => MapCore.map.flyToBounds(bounds, {padding: [24, 24]}) : null}))
		})
	}

	// Clicking a category row focuses it (turns every other real category
	// off); clicking the already-isolated category again restores all
	// categories. "others" is treated like the author-type "unknown"
	// bucket below (see filter-state.js) — it always stays visible, so
	// isolating it just means turning off every other real category
	// rather than turning "others" on, and it's never itself required to
	// be "active" for another category's isolation to count.
	function isCategoryIsolated(key) {
		const realCategories = Object.keys(Theme.categoryColors).filter(cat => cat !== "others")
		if (key === "others") return realCategories.every(cat => !FilterState.isCategoryActive(cat))
		return realCategories.every(cat => FilterState.isCategoryActive(cat) === (cat === key))
	}
	function toggleCategoryIsolation(key) {
		const allCategories = Object.keys(Theme.categoryColors)
		const realCategories = allCategories.filter(cat => cat !== "others")
		if (isCategoryIsolated(key)) {
			allCategories.forEach(cat => FilterState.setCategoryActive(cat, true))
		} else if (key === "others") {
			realCategories.forEach(cat => FilterState.setCategoryActive(cat, false))
		} else {
			realCategories.forEach(cat => FilterState.setCategoryActive(cat, cat === key))
		}
	}

	function renderCategories(scope) {
		categoriesEl.innerHTML = `<div class="analytics-section__title">Categories represented</div>`
		if (!scope.length) {
			categoriesEl.appendChild(Utils.el("div", {className: "analytics-empty", text: "No records in this view."}))
			return
		}
		const counts = {}
		scope.forEach(index => {
			const category = ArchiveData.features[index].properties.category
			counts[category] = (counts[category] ?? 0) + 1
		})
		topEntries(counts, scope.length, "others").forEach(({key, pct, count}) => {
			const label = key === "others" ? "Other / Unknown" : Utils.capitalize(key)
			const color = key === "others" ? Utils.readCssVar("--color-unknown") : Theme.categoryColor(key)
			const row = barRow({label, pct, count, color, onClick: () => toggleCategoryIsolation(key)})
			row.classList.toggle("is-isolated", isCategoryIsolated(key))
			categoriesEl.appendChild(row)
		})
	}

	// Author types mirror the category isolation behaviour above. Two
	// buckets collapse into the same "unknown" row: a genuinely missing
	// (null) authorType, and the real authorType id "others" — both read
	// as "Other / Unknown" to the user and both always pass FilterState's
	// author-type check (see isOtherOrMissing in filter-state.js), so
	// isolating either one turns off every other real author type rather
	// than turning one on.
	function isAuthorTypeIsolated(key) {
		const realAuthorTypes = Object.keys(Theme.authorTypeColors).filter(type => type !== "others")
		if (key === "unknown") return realAuthorTypes.every(type => !FilterState.isAuthorTypeActive(type))
		return realAuthorTypes.every(type => FilterState.isAuthorTypeActive(type) === (type === key))
	}
	function toggleAuthorTypeIsolation(key) {
		const allAuthorTypes = Object.keys(Theme.authorTypeColors)
		const realAuthorTypes = allAuthorTypes.filter(type => type !== "others")
		if (isAuthorTypeIsolated(key)) {
			allAuthorTypes.forEach(type => FilterState.setAuthorTypeActive(type, true))
		} else if (key === "unknown") {
			realAuthorTypes.forEach(type => FilterState.setAuthorTypeActive(type, false))
		} else {
			realAuthorTypes.forEach(type => FilterState.setAuthorTypeActive(type, type === key))
		}
	}
	function renderAuthorTypes(scope) {
		authorTypesEl.innerHTML = `<div class="analytics-section__title">Author types represented</div>`
		if (!scope.length) {
			authorTypesEl.appendChild(Utils.el("div", {className: "analytics-empty", text: "No records in this view."}))
			return
		}
		const counts = {}
		scope.forEach(index => {
			const raw = ArchiveData.features[index].properties.authorType
			const authorType = !raw || raw === "others" ? "unknown" : raw
			counts[authorType] = (counts[authorType] ?? 0) + 1
		})
		topEntries(counts, scope.length, "unknown").forEach(({key, pct, count}) => {
			const label = key === "unknown" ? "Other / Unknown" : Utils.capitalize(key)
			const color = key === "unknown" ? Utils.readCssVar("--color-unknown") : Theme.authorTypeColor(key)
			const row = barRow({label, pct, count, color, onClick: () => toggleAuthorTypeIsolation(key)})
			row.classList.toggle("is-isolated", isAuthorTypeIsolated(key))
			authorTypesEl.appendChild(row)
		})
	}

	function renderTimeline(scope, hiddenCount) {
		const counts = {}
		decades.forEach(d => (counts[d] = 0))
		scope.forEach(index => {
			const d = decadeOf(ArchiveData.features[index].properties.time)
			if (d in counts) counts[d] += 1
		})
		const maxCount = Math.max(1, ...Object.values(counts))
		const width = 280,
			height = 44,
			gap = 1.5
		const barWidth = decades.length ? width / decades.length - gap : 0
		const bars = decades
			.map((d, i) => {
				const x = i * (barWidth + gap)
				const h = Math.max(2, (counts[d] / maxCount) * (height - 4))
				const y = height - h
				const isActive = d + 10 > FilterState.minYear && d <= FilterState.maxYear
				return Utils.html`<rect class="analytics-timeline__bar${isActive ? " is-active" : ""}" data-decade="${d}" x="${x}" y="${y}" width="${Math.max(1, barWidth)}" height="${h}"><title>${d}s: ${counts[d]} record${counts[d] === 1 ? "" : "s"}</title></rect>`
			})
			.join("")
		const hiddenNotice = hiddenCount > 0 ? Utils.html`<div class="analytics-timeline__hidden">${hiddenCount} record${hiddenCount === 1 ? "" : "s"} hidden by the timeline filter</div>` : ""
		timelineEl.innerHTML = Utils.html`
			<div class="analytics-section__title-row">
				<div class="analytics-section__title">Timeline</div>
				<button type="button" class="analytics-timeline__clear" id="timelineClearBtn" aria-label="Clear timeline filter">Clear</button>
			</div>
			<svg class="analytics-timeline" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="Records per decade, click or drag to filter by year">${bars}</svg>
			<div class="analytics-timeline__range"><span>${decades[0]}s</span><span>${decades[decades.length - 1]}s</span></div>
			${hiddenNotice}
			<div class="analytics-timeline__hint">Click a decade, or drag to select a range</div>`
		wireTimelineInteraction(timelineEl.querySelector("svg"))
		timelineEl.querySelector("#timelineClearBtn").addEventListener("click", () => {
			TimeSlider.setRange(dataMinYear, dataMaxYear)
			render()
		})
	}

	function wireTimelineInteraction(svg) {
		if (!svg) return
		let dragStartDecade = null
		function decadeFromEvent(evt) {
			const rect = svg.getBoundingClientRect()
			if (!rect.width) return null
			const fraction = (evt.clientX - rect.left) / rect.width
			const index = Math.min(decades.length - 1, Math.max(0, Math.floor(fraction * decades.length)))
			return decades[index]
		}
		function setBrushHighlight(fromDecade, toDecade) {
			const [lo, hi] = fromDecade <= toDecade ? [fromDecade, toDecade] : [toDecade, fromDecade]
			svg.querySelectorAll("[data-decade]").forEach(bar => {
				const d = Number(bar.dataset.decade)
				bar.classList.toggle("is-brushing", d >= lo && d <= hi)
			})
		}
		function applyRange(fromDecade, toDecade) {
			const [lo, hi] = fromDecade <= toDecade ? [fromDecade, toDecade] : [toDecade, fromDecade]
			TimeSlider.setRange(Math.max(dataMinYear, lo), Math.min(dataMaxYear, hi + 9))
		}
		svg.addEventListener("pointerdown", evt => {
			const decade = decadeFromEvent(evt)
			if (decade === null) return
			dragStartDecade = decade
			svg.setPointerCapture(evt.pointerId)
		})
		svg.addEventListener("pointermove", evt => {
			if (dragStartDecade === null) return
			const decade = decadeFromEvent(evt)
			if (decade !== null) setBrushHighlight(dragStartDecade, decade)
		})
		svg.addEventListener("pointerup", evt => {
			if (dragStartDecade === null) return
			const decade = decadeFromEvent(evt) ?? dragStartDecade
			applyRange(dragStartDecade, decade)
			dragStartDecade = null
			render()
		})
		svg.addEventListener("pointerleave", () => {
			if (dragStartDecade === null) render()
		})
	}

	function render() {
		const scope = currentScopeIndices()
		const timelineScope = timelineScopeIndices()
		// When a selection is active, both scopes are the selection itself
		// (filters are bypassed), so nothing reads as "hidden by timeline".
		const hiddenByTimeline = Math.max(0, timelineScope.length - scope.length)
		renderRecordsInView(scope)
		renderIslands(scope)
		renderTimeline(timelineScope, hiddenByTimeline)
		renderCategories(scope)
		renderAuthorTypes(scope)
	}

	function init() {
		const startCollapsed = window.matchMedia("(max-width: 30rem)").matches

		// Starts expanded on wider viewports (no is-collapsed class) so the
		// research summary is visible as soon as the page loads; starts
		// collapsed by default on narrow/mobile viewports instead.
		const panel = Utils.el("div", {className: `analytics-panel${startCollapsed ? " is-collapsed" : ""}`, "aria-label": "Analytics summary"})
		document.getElementById("map").appendChild(panel)

		const {headerEl, collapseBtn} = buildHeader({title: "Research Summary", collapseLabel: "Expand research summary"})
		panel.appendChild(headerEl)

		// data-collapsed starts in sync with `startCollapsed` above — the CSS
		// collapse transition in ADD_TO_YOUR_CSS.css keys off this attribute.
		// This wrapper exists purely to give the CSS grid collapse trick a
		// single grid item to animate — `bodyEl` below (which holds the
		// actual section content) sits inside it unchanged.
		const collapseWrap = Utils.el("div", {className: "analytics-panel__collapse", "data-collapsed": String(startCollapsed)})
		panel.appendChild(collapseWrap)

		bodyEl = Utils.el("div", {className: "analytics-panel__body"})
		collapseWrap.appendChild(bodyEl)
		bodyEl.appendChild(Utils.el("div", {className: "divider", role: "separator"}))

		recordsEl = Utils.el("div", {className: "analytics-section"})
		islandsEl = Utils.el("div", {className: "analytics-section"})
		timelineEl = Utils.el("div", {className: "analytics-section"})
		categoriesEl = Utils.el("div", {className: "analytics-section"})
		authorTypesEl = Utils.el("div", {className: "analytics-section"})

		// Sections joined by a divider, none trailing the last one.
		const sections = [recordsEl, islandsEl, timelineEl, categoriesEl, authorTypesEl]
		sections.forEach((section, index) => {
			if (index > 0) bodyEl.appendChild(Utils.el("div", {className: "divider", role: "separator"}))
			bodyEl.appendChild(section)
		})

		collapsible = createCollapsible({panelEl: panel, collapseBtn, bodyEl: collapseWrap, expandLabel: "Expand research summary", collapseLabel: "Collapse research summary"})
		collapsible.setCollapsed(startCollapsed)
		collapseBtn.addEventListener("click", () => collapsible.setCollapsed(!collapsible.isCollapsed()))
		isolateFromMap(panel)

		// Filter/selection changes are infrequent and cheap to react to
		// immediately. Map pans fire moveend repeatedly during a drag/zoom
		// gesture, so those are debounced to avoid rebuilding the panel on
		// every intermediate frame.
		const debouncedRender = Utils.debounce(render, 150)
		EventBus.on("filters:changed", render)
		EventBus.on("selection:changed", render)
		MapCore.map.on("moveend zoomend", debouncedRender)

		render()
	}
	function recordsInViewCount() {
		return recordsInView
	}
	return {init, recordsInViewCount}
})()

export default AnalyticsPanel
