import ArchiveData from "../data/archive-data.js"
import MapCore from "../map/map-core.js"
import SelectionState from "../state/selection-state.js"
import FilterState from "../state/filter-state.js"
import ViewportQuery from "../state/viewport-query.js"
import GeoIndex from "../data/geo-index.js"
import Theme from "../state/theme.js"
import Shapes from "../markers/shapes.js"
import Utils from "../utils.js"
import TimeSlider from "./time-slider-footer.js"
import EventBus from "../event-bus.js"
import {isolateFromMap, createCollapsible, mountHeader, isNarrowViewport} from "./panel-behaviors.js"

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

	let bodyEl, recordsEl, islandsEl, timelineEl, creoleRolesEl, categoriesEl, authorTypesEl, collapsible
	let recordsInView = 0

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
	// Priority-ordered, mutually-exclusive hidden-record tally backing the
	// "x records hidden by the ... filter" notices (see
	// FilterState.classifyHiddenReason for the priority order: creole
	// role, timeline, author type, category). A selection bypasses
	// filters entirely (see currentScopeIndices), so nothing reads as
	// hidden by anything in that case.
	function hiddenCounts() {
		if (SelectionState.size() > 0) return {creoleRole: 0, timeline: 0, authorType: 0, category: 0}
		return ViewportQuery.hiddenCounts()
	}
	function hiddenNoticeHtml(hiddenCount, filterLabel) {
		return hiddenCount > 0 ? Utils.html`<div class="analytics-timeline__hidden">${hiddenCount} record${hiddenCount === 1 ? "" : "s"} hidden by the ${filterLabel} filter</div>` : ""
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
	function barRow({label, pct, count, color, icon, onClick}) {
		const row = Utils.el("div", {className: "analytics-bar-row"})
		row.innerHTML = Utils.html`
			${icon ? `<span class="analytics-bar-row__dot analytics-bar-row__dot--icon">${icon}</span>` : color ? `<span class="analytics-bar-row__dot" style="background:${color}"></span>` : ""}
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
			<div class="analytics-section__title-row">
				<div class="analytics-section__title">Records in view</div>
				<button type="button" class="analytics-filter__clear" id="clearAllBtn" aria-label="Clear all filters">Clear all</button>
			</div>
			<div class="analytics-hero">
				<span class="analytics-hero__count">${scope.length}</span>
				<span class="analytics-hero__total">/ ${total}</span>
			</div>
            `
		recordsEl.querySelector("#clearAllBtn").addEventListener("click", () => {
			TimeSlider.setRange(dataMinYear, dataMaxYear)
			FilterState.setAllVisible(true)
		})
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

	// Creole role has no "others"/missing-value bypass like category and
	// authorType do — "unknown" here is just a third real, independently
	// toggleable role (see FilterState.roleKeyFor), so isolation is the
	// plain "exactly one of the three is active" version.
	const creoleRoleLabels = {using: "Using creoles", about: "About creoles", unknown: "Unknown"}
	function roleKeyFor(creole) {
		return creole === "using" ? "using" : creole === "about" ? "about" : "unknown"
	}
	function isCreoleRoleIsolated(key) {
		return Object.keys(creoleRoleLabels).every(role => FilterState.isCreoleRoleActive(role) === (role === key))
	}
	function toggleCreoleRoleIsolation(key) {
		const allRoles = Object.keys(creoleRoleLabels)
		if (isCreoleRoleIsolated(key)) {
			allRoles.forEach(role => FilterState.setCreoleRoleActive(role, true))
		} else {
			allRoles.forEach(role => FilterState.setCreoleRoleActive(role, role === key))
		}
	}
	function renderCreoleRoles(scope, hiddenCount) {
		creoleRolesEl.innerHTML = `
			<div class="analytics-section__title-row">
				<div class="analytics-section__title">Creole role represented</div>
				<button type="button" class="analytics-filter__clear" id="creoleRolesClearBtn" aria-label="Clear creole role filter">Clear</button>
			</div>
			${hiddenNoticeHtml(hiddenCount, "creole role")}`
		creoleRolesEl.querySelector("#creoleRolesClearBtn").addEventListener("click", () => {
			Object.keys(creoleRoleLabels).forEach(role => FilterState.setCreoleRoleActive(role, true))
		})
		if (!scope.length) {
			creoleRolesEl.appendChild(Utils.el("div", {className: "analytics-empty", text: "No records in this view."}))
			return
		}
		const counts = {}
		scope.forEach(index => {
			const role = roleKeyFor(ArchiveData.features[index].properties.creole)
			counts[role] = (counts[role] ?? 0) + 1
		})
		topEntries(counts, scope.length).forEach(({key, pct, count}) => {
			const row = barRow({label: creoleRoleLabels[key], pct, count, icon: Shapes.roleLegendSvg(key, Theme.roleColor(key)), onClick: () => toggleCreoleRoleIsolation(key)})
			row.classList.toggle("is-isolated", isCreoleRoleIsolated(key))
			creoleRolesEl.appendChild(row)
		})
	}

	function renderCategories(scope, hiddenCount) {
		categoriesEl.innerHTML = `
			<div class="analytics-section__title-row">
				<div class="analytics-section__title">Categories represented</div>
				<button type="button" class="analytics-filter__clear" id="categoriesClearBtn" aria-label="Clear category filter">Clear</button>
			</div>
			${hiddenNoticeHtml(hiddenCount, "category")}`
		categoriesEl.querySelector("#categoriesClearBtn").addEventListener("click", () => {
			Object.keys(Theme.categoryColors).forEach(cat => FilterState.setCategoryActive(cat, true))
		})
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
			const row = barRow({label, pct, count, icon: Shapes.categorySvg(key, color), onClick: () => toggleCategoryIsolation(key)})
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
		const realAuthorTypes = Theme.authorTypeIds.filter(type => type !== "others")
		if (key === "unknown") return realAuthorTypes.every(type => !FilterState.isAuthorTypeActive(type))
		return realAuthorTypes.every(type => FilterState.isAuthorTypeActive(type) === (type === key))
	}
	function toggleAuthorTypeIsolation(key) {
		const allAuthorTypes = Theme.authorTypeIds
		const realAuthorTypes = allAuthorTypes.filter(type => type !== "others")
		if (isAuthorTypeIsolated(key)) {
			allAuthorTypes.forEach(type => FilterState.setAuthorTypeActive(type, true))
		} else if (key === "unknown") {
			realAuthorTypes.forEach(type => FilterState.setAuthorTypeActive(type, false))
		} else {
			realAuthorTypes.forEach(type => FilterState.setAuthorTypeActive(type, type === key))
		}
	}
	function renderAuthorTypes(scope, hiddenCount) {
		authorTypesEl.innerHTML = `
			<div class="analytics-section__title-row">
				<div class="analytics-section__title">Author types represented</div>
				<button type="button" class="analytics-filter__clear" id="authorTypesClearBtn" aria-label="Clear author type filter">Clear</button>
			</div>
			${hiddenNoticeHtml(hiddenCount, "author type")}`
		authorTypesEl.querySelector("#authorTypesClearBtn").addEventListener("click", () => {
			Theme.authorTypeIds.forEach(type => FilterState.setAuthorTypeActive(type, true))
		})
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
			const row = barRow({label, pct, count, onClick: () => toggleAuthorTypeIsolation(key)})
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
		const hiddenNotice = hiddenNoticeHtml(hiddenCount, "timeline")
		timelineEl.innerHTML = Utils.html`
			<div class="analytics-section__title-row">
				<div class="analytics-section__title">Timeline</div>
				<button type="button" class="analytics-filter__clear" id="timelineClearBtn" aria-label="Clear timeline filter">Clear</button>
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
		const hidden = hiddenCounts()
		renderRecordsInView(scope)
		renderIslands(scope)
		renderTimeline(timelineScope, hidden.timeline)
		renderCreoleRoles(scope, hidden.creoleRole)
		renderCategories(scope, hidden.category)
		renderAuthorTypes(scope, hidden.authorType)
	}

	// Markup (collapse wrapper, sections, dividers) lives statically in
	// map.html (#analytics-panel); the header is mounted via the shared
	// `mountHeader` component, and this otherwise only wires up behavior
	// and fills in the data-driven section content — matching how Legend
	// and SelectionResults attach to their static shells.
	function init() {
		const startCollapsed = isNarrowViewport()

		const panel = document.getElementById("analytics-panel")
		const headerEl = document.getElementById("analytics-panel__header")
		const collapseWrap = document.getElementById("analytics-panel__collapse")
		bodyEl = document.getElementById("analytics-panel__body")

		recordsEl = document.getElementById("analytics-panel__records")
		islandsEl = document.getElementById("analytics-panel__islands")
		timelineEl = document.getElementById("analytics-panel__timeline")
		creoleRolesEl = document.getElementById("analytics-panel__creole-roles")
		categoriesEl = document.getElementById("analytics-panel__categories")
		authorTypesEl = document.getElementById("analytics-panel__author-types")

		const collapseBtn = mountHeader(headerEl, "analytics-panel", {
			title: "Research Summary"
		})

		// Starts expanded on wider viewports so the research summary is
		// visible as soon as the page loads; starts collapsed by default on
		// narrow/mobile viewports instead.
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
