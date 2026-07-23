import ArchiveData from "../data/archive-data.js"
import MapCore from "../map/map-core.js"
import Markers from "../markers/markers.js"
import SelectionState from "../state/selection-state.js"
import FilterState from "../state/filter-state.js"
import GeoIndex from "../data/geo-index.js"
import Theme from "../state/theme.js"
import Utils from "../utils.js"
import TimeSlider from "./time-slider.js"
import Panels from "./panels.js"
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

	let bodyEl, recordsEl, islandsEl, timelineEl, categoriesEl, collapsible

	function inViewIndices() {
		const bounds = MapCore.map.getBounds()
		const indices = []
		Markers.all().forEach((marker, index) => {
			if (MapCore.map.hasLayer(marker) && bounds.contains(marker.getLatLng())) indices.push(index)
		})
		return indices
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
		const bounds = MapCore.map.getBounds()
		const indices = []
		ArchiveData.features.forEach((feature, index) => {
			if (!FilterState.isFeatureVisibleIgnoringYear(feature.properties)) return
			const [lng, lat] = feature.geometry.coordinates
			if (bounds.contains(L.latLng(lat, lng))) indices.push(index)
		})
		return indices
	}

	function topEntries(counts, total) {
		const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
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
		recordsEl.innerHTML = Utils.html`
			<div class="analytics-section__title">Records in view</div>
			<div class="analytics-hero">
				<span class="analytics-hero__count">${scope.length}</span>
				<span class="analytics-hero__total">/ ${total}</span>
			</div>`
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
		topEntries(counts, scope.length).forEach(({key, pct, count}) => {
			const color = key === "Unknown" ? Utils.readCssVar("--color-unknown") : Theme.categoryColor(key)
			categoriesEl.appendChild(barRow({label: Utils.capitalize(key), pct, count, color}))
		})
	}

	function renderTimeline(scope) {
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
		timelineEl.innerHTML = Utils.html`
			<div class="analytics-section__title-row">
				<div class="analytics-section__title">Timeline</div>
				<button type="button" class="selection-results__clear analytics-timeline__clear" id="timelineClearBtn" aria-label="Clear timeline filter">Clear</button>
			</div>
			<svg class="analytics-timeline" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="Records per decade, click or drag to filter by year">${bars}</svg>
			<div class="analytics-timeline__range"><span>${decades[0]}s</span><span>${decades[decades.length - 1]}s</span></div>
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
			// Hit-testing the bar element itself (via evt.target or
			// elementFromPoint) only works when the pointer is exactly over
			// the drawn rect — which is often just a couple of pixels tall
			// for low-count decades. Instead, map the pointer's x position to
			// its column across the full height of the chart, so anywhere
			// above/below a short bar still counts as that decade.
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
		renderRecordsInView(scope)
		renderIslands(scope)
		renderTimeline(timelineScopeIndices())
		renderCategories(scope)
		if (bodyEl && collapsible && !collapsible.isCollapsed()) bodyEl.style.maxHeight = `${bodyEl.scrollHeight}px`
	}

	function init() {
		// Starts expanded (no is-collapsed class) so the research summary
		// is visible as soon as the page loads.
		const panel = Utils.el("div", {className: "map-legend analytics-panel", "aria-label": "Analytics summary"})
		document.getElementById("map").appendChild(panel)

		const {headerEl, collapseBtn} = Panels.buildHeader({title: "Research Summary", collapseLabel: "Expand research summary"})
		panel.appendChild(headerEl)

		bodyEl = Utils.el("div", {className: "legend__body"})
		panel.appendChild(bodyEl)
		recordsEl = Utils.el("div", {className: "analytics-section"})
		islandsEl = Utils.el("div", {className: "analytics-section"})
		timelineEl = Utils.el("div", {className: "analytics-section"})
		categoriesEl = Utils.el("div", {className: "analytics-section"})
		bodyEl.append(recordsEl, islandsEl, timelineEl, categoriesEl)

		collapsible = Panels.createCollapsible({panelEl: panel, headerEl, collapseBtn, bodyEl, expandLabel: "Expand research summary", collapseLabel: "Collapse research summary"})
		collapsible.setCollapsed(false)
		collapseBtn.addEventListener("click", () => collapsible.setCollapsed(!collapsible.isCollapsed()))
		Panels.isolateFromMap(panel)

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
	return {init}
})()

export default AnalyticsPanel
