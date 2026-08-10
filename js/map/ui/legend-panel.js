import Utils from "../utils.js"
import Shapes from "../markers/shapes.js"
import Theme from "../state/theme.js"
import FilterState from "../state/filter-state.js"
import Boundaries from "../map/boundaries.js"
import EventBus from "../event-bus.js"
import ViewportQuery from "../state/viewport-query.js"
import MapCore from "../map/map-core.js"
import {isolateFromMap, createCollapsible, mountHeader, isNarrowViewport} from "./panel-behaviors.js"

// ─────────────────────────────────────────────────────────────
// Legend — the "On map / Filters" legend panel. Presentation only;
// every toggle reads/writes through FilterState or Boundaries.
// ─────────────────────────────────────────────────────────────
const Legend = (() => {
	// Registered by each built row; called on `filters:changed` to sync
	// checked/is-off state without tearing down and rebuilding the panel.
	let syncFns = []
	let updateHeaderHidden = () => {}

	// Wires the "N hidden by filters" notice living next to the title
	// (see init()); the returned function should be re-invoked whenever
	// filters or the viewport change (see syncCheckedState()).
	function wireHiddenNotice(hiddenEl, hiddenCountFn) {
		const updateHidden = () => {
			const count = hiddenCountFn()
			hiddenEl.textContent = count > 0 ? `${count} hidden by filters` : ""
			hiddenEl.classList.toggle("is-visible", count > 0)
		}
		updateHidden()
		return updateHidden
	}

	// toggleRow builds a single legend row: an icon-checkbox toggle plus
	// label. The row set itself is static (defined by Theme/Boundaries
	// config); only checked/is-off state changes afterwards (see
	// syncCheckedState()).
	function toggleRow({id, label, iconHtml, initialColor, checked = true, onChange, getChecked}) {
		const checkboxId = `cb-${id}`
		const row = Utils.el("div", {className: "legend__item"})
		row.style.setProperty("--shape-color", initialColor)
		row.innerHTML = Utils.html` <label class="legend__icon-toggle" id="toggle-${id}" title="Toggle ${label}">
	                                    <input type="checkbox" id="${checkboxId}" ${checked ? "checked" : ""} aria-label="Toggle ${label}" />
	                                    ${iconHtml}
                                    </label>
                                    <label class="legend__item-label" for="${checkboxId}">${label}</label>`
		const checkbox = row.querySelector("input")
		const iconToggle = row.querySelector(".legend__icon-toggle")
		row.classList.toggle("is-off", !checked)
		iconToggle.classList.toggle("is-off", !checked)
		checkbox.addEventListener("change", () => {
			const isOn = checkbox.checked
			row.classList.toggle("is-off", !isOn)
			iconToggle.classList.toggle("is-off", !isOn)
			onChange(isOn)
		})
		if (getChecked) {
			syncFns.push(() => {
				const isOn = getChecked()
				if (checkbox.checked !== isOn) checkbox.checked = isOn
				row.classList.toggle("is-off", !isOn)
				iconToggle.classList.toggle("is-off", !isOn)
			})
		}
		return row
	}
	function groupTitle(text) {
		return Utils.el("div", {className: "legend__group-title", text})
	}

	// Total records currently hidden by the legend's own filters (creole
	// role, author type, category — Layers isn't a FilterState predicate
	// so it isn't part of this). Compared against "ignoreYear" rather than
	// "active": "active" respects the year range too, which would double
	// -count records already surfaced by AnalyticsPanel's timeline notice.
	// "none" and "ignoreYear" are real ViewportQuery predicates, so this
	// stays a viewport-wide diff rather than a per-group breakdown.
	function totalHiddenByFilters() {
		const unfiltered = ViewportQuery.featuresInView({respectFilters: "none"})
		const withoutYearFilter = ViewportQuery.featuresInView({respectFilters: "ignoreYear"})
		return Math.max(0, unfiltered.length - withoutYearFilter.length)
	}

	const creoleRoleEntries = [
		{key: "using", label: "Using creoles"},
		{key: "about", label: "About creoles"},
		{key: "unknown", label: "Unknown"}
	]
	// Each group builder returns [titleEl, ...rowEls] or null when empty.
	// `presentKeys` can limit a group to a specific set of keys; currently
	// always called with null (render every possible key). Kept as a
	// parameter in case a filtered view is reintroduced later.
	function creoleRoleGroup(presentKeys) {
		const entries = creoleRoleEntries.filter(({key}) => !presentKeys || presentKeys.has(key))
		if (!entries.length) return null
		return [
			groupTitle("Creole"),
			...entries.map(({key, label}) => {
				const color = Theme.roleColor(key)
				return toggleRow({
					id: `legend-creole-${key}`,
					label,
					iconHtml: Shapes.roleLegendSvg(key, color),
					initialColor: color,
					checked: FilterState.isCreoleRoleActive(key),
					onChange: isOn => FilterState.setCreoleRoleActive(key, isOn),
					getChecked: () => FilterState.isCreoleRoleActive(key)
				})
			})
		]
	}
	function authorTypeGroup(presentKeys) {
		const entries = Theme.authorTypeIds.filter(key => !presentKeys || presentKeys.has(key))
		if (!entries.length) return null
		return [
			groupTitle("Author type"),
			...entries.map(typeKey =>
				toggleRow({
					id: `legend-atype-${typeKey}`,
					label: Utils.capitalize(typeKey),
					iconHtml: Shapes.legendSvg("unknown"),
					initialColor: "var(--colorTextSecondary)",
					checked: FilterState.isAuthorTypeActive(typeKey),
					onChange: isOn => FilterState.setAuthorTypeActive(typeKey, isOn),
					getChecked: () => FilterState.isAuthorTypeActive(typeKey)
				})
			)
		]
	}
	function categoryGroup(presentKeys) {
		const entries = Object.entries(Theme.categoryColors).filter(([key]) => !presentKeys || presentKeys.has(key))
		if (!entries.length) return null
		return [
			groupTitle("Document type"),
			...entries.map(([catKey, color]) =>
				toggleRow({
					id: `legend-cat-${catKey}`,
					label: Utils.capitalize(catKey),
					iconHtml: Shapes.legendSvg("unknown"),
					initialColor: color,
					checked: FilterState.isCategoryActive(catKey),
					onChange: isOn => FilterState.setCategoryActive(catKey, isOn),
					getChecked: () => FilterState.isCategoryActive(catKey)
				})
			)
		]
	}
	function layersGroup() {
		const toggles = Boundaries.getToggles()
		if (!toggles.length) return null
		return [
			groupTitle("Layers"),
			...toggles.map(({key, label, shapeKind, color}) =>
				toggleRow({
					id: `legend-layer-${key}`,
					label,
					iconHtml: Shapes.legendSvg(shapeKind),
					initialColor: color,
					checked: Boundaries.isVisible(key),
					onChange: isOn => Boundaries.setVisible(key, isOn),
					getChecked: () => Boundaries.isVisible(key)
				})
			)
		]
	}
	function buildPanel(body) {
		syncFns = []
		body.innerHTML = ""
		const groups = [layersGroup(), creoleRoleGroup(null), categoryGroup(null), authorTypeGroup(null)].filter(Boolean)
		groups.forEach((els, i) => {
			els.forEach(el => body.appendChild(el))
		})
	}
	function syncCheckedState() {
		syncFns.forEach(fn => fn())
		updateHeaderHidden()
	}

	// Markup (header, collapse wrapper, actions row, dividers) lives
	// statically in map.html (#legend-panel); this only wires up behavior
	// and fills in the data-driven groups content, matching how
	// SelectionResults and AnalyticsPanel attach to their static shells.
	// Markup (collapse wrapper, actions row, dividers) lives statically in
	// map.html (#legend-panel); the header is mounted via the shared
	// `mountHeader` component, and this otherwise only wires up behavior
	// and fills in the data-driven groups content — matching how
	// SelectionResults and AnalyticsPanel attach to their static shells.
	function init() {
		const legend = document.getElementById("legend-panel")
		const headerEl = document.getElementById("legend-panel__header")
		const collapseWrap = document.getElementById("legend-panel__collapse")
		const panel = document.getElementById("legend-panel__groups")

		const hiddenEl = Utils.el("span", {className: "legend-panel__hidden"})
		const collapseBtn = mountHeader(headerEl, "legend-panel", {
			title: "Legend",
			extraEl: hiddenEl
		})
		updateHeaderHidden = wireHiddenNotice(hiddenEl, totalHiddenByFilters)

		document.getElementById("legend-panel__all-on-btn").addEventListener("click", () => FilterState.setAllVisible(true))
		document.getElementById("legend-panel__all-off-btn").addEventListener("click", () => FilterState.setAllVisible(false))

		const collapsible = createCollapsible({panelEl: legend, collapseBtn, bodyEl: collapseWrap, expandLabel: "Expand legend", collapseLabel: "Collapse legend", name: "legend"})
		// Starts collapsed (matches the "is-collapsed" class + collapseWrap's
		// data-collapsed="true" already set on the static markup); set here
		// too so the collapse button's aria state agrees with it from the
		// start, since the header itself is only mounted in JS.
		collapsible.setCollapsed(true)
		collapseBtn.addEventListener("click", () => collapsible.setCollapsed(!collapsible.isCollapsed()))
		// Desktop-only: the legend and results panels can overlap when both
		// are expanded, so collapse this one whenever results expands.
		EventBus.on("panel:collapseChanged", ({name, collapsed}) => {
			if (name === "results" && !collapsed && !isNarrowViewport()) collapsible.setCollapsed(true)
		})

		buildPanel(panel)
		// Keep the panel honest as filters/time-range change which markers are
		// actually rendered — this only toggles checked/is-off state on the
		// existing rows; it never tears down and rebuilds the panel (the row
		// set itself is static, defined by Theme/Boundaries config). Because
		// the expand/collapse height transition is CSS-driven off
		// `collapseWrap`'s `data-collapsed` attribute rather than a
		// JS-measured max-height, this sync never needs to recompute or
		// write height.
		EventBus.on("filters:changed", syncCheckedState)
		// Hidden counts are viewport-dependent (not just filter-dependent),
		// so they also need refreshing as the map pans/zooms. Debounced for
		// the same reason AnalyticsPanel debounces its moveend handler:
		// moveend/zoomend fire repeatedly during a drag/zoom gesture.
		const debouncedSync = Utils.debounce(syncCheckedState, 150)
		MapCore.map.on("moveend zoomend", debouncedSync)

		isolateFromMap(legend)
	}
	return {init}
})()

export default Legend
