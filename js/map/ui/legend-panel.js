import Utils from "../utils.js"
import Shapes from "../markers/shapes.js"
import Theme from "../state/theme.js"
import FilterState from "../state/filter-state.js"
import Boundaries from "../map/boundaries.js"
import EventBus from "../event-bus.js"
import ViewportQuery from "../state/viewport-query.js"
import MapCore from "../map/map-core.js"

// ─────────────────────────────────────────────────────────────
// Legend — the "On map / Filters" legend panel. Presentation only;
// every toggle reads/writes through FilterState or Boundaries.
// ─────────────────────────────────────────────────────────────
const Legend = (() => {
	// Registered by each built row; called on `filters:changed` to sync
	// checked/is-off state without tearing down and rebuilding the panel.
	let syncFns = []
	let updateHeaderHidden = () => {}

	function isolateFromMap(el) {
		L.DomEvent.disableScrollPropagation(el)
		L.DomEvent.disableClickPropagation(el)
	}

	const collapseChevronSvg = Utils.html`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="2,9 7,4 12,9" /></svg>`

	// Builds a "<title> ...... <collapse button>" header row. When
	// `hiddenCountFn` is given, an inline notice sits right after the
	// title; the returned `updateHidden` should be re-invoked whenever
	// filters or the viewport change (see init()/syncCheckedState()).
	function buildHeader({title, collapseLabel, hiddenCountFn}) {
		const headerEl = Utils.el("div", {className: "legend-panel__header"})
		if (title) headerEl.appendChild(Utils.el("span", {className: "legend-panel__title", text: title}))
		let updateHidden = () => {}
		if (hiddenCountFn) {
			const hiddenEl = Utils.el("span", {className: "legend-panel__hidden"})
			headerEl.appendChild(hiddenEl)
			updateHidden = () => {
				const count = hiddenCountFn()
				hiddenEl.textContent = count > 0 ? `${count} hidden by filters` : ""
				hiddenEl.classList.toggle("is-visible", count > 0)
			}
			updateHidden()
		}
		const collapseBtn = Utils.el("button", {
			className: "collapse-btn legend-panel__collapse-btn",
			"aria-label": collapseLabel,
			"aria-expanded": "false",
			html: collapseChevronSvg
		})
		headerEl.appendChild(collapseBtn)
		return {headerEl, collapseBtn, updateHidden}
	}

	// Collapse/expand only toggles classes + aria state; the dividers live
	// statically in the markup (see init()) and are hidden for free when
	// `bodyEl`'s CSS collapse transition shrinks it to nothing.
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

	function toggleRow({id, label, shapeKind, initialColor, checked = true, onChange, getChecked}) {
		const checkboxId = `cb-${id}`
		const row = Utils.el("div", {className: "legend__item"})
		row.style.setProperty("--shape-color", initialColor)
		row.innerHTML = Utils.html` <label class="legend__icon-toggle" id="toggle-${id}" title="Toggle ${label}">
	                                    <input type="checkbox" id="${checkboxId}" ${checked ? "checked" : ""} aria-label="Toggle ${label}" />
	                                    ${Shapes.legendSvg(shapeKind)}
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
	function divider(className = "divider") {
		return Utils.el("div", {className, role: "separator"})
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
		{key: "using", label: "Using creoles", shapeKind: "using"},
		{key: "about", label: "About creoles", shapeKind: "about"},
		{key: "unknown", label: "Unknown", shapeKind: "unknown"}
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
			...entries.map(({key, label, shapeKind}) =>
				toggleRow({
					id: `legend-creole-${key}`,
					label,
					shapeKind,
					initialColor: "white",
					checked: FilterState.isCreoleRoleActive(key),
					onChange: isOn => FilterState.setCreoleRoleActive(key, isOn),
					getChecked: () => FilterState.isCreoleRoleActive(key)
				})
			)
		]
	}
	function authorTypeGroup(presentKeys) {
		const entries = Object.entries(Theme.authorTypeColors).filter(([key]) => !presentKeys || presentKeys.has(key))
		if (!entries.length) return null
		return [
			groupTitle("Author type"),
			...entries.map(([typeKey, color]) =>
				toggleRow({
					id: `legend-atype-${typeKey}`,
					label: Utils.capitalize(typeKey),
					shapeKind: "ring",
					initialColor: color,
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
					shapeKind: "unknown",
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
					shapeKind,
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
		const groups = [layersGroup(), creoleRoleGroup(null), authorTypeGroup(null), categoryGroup(null)].filter(Boolean)
		groups.forEach((els, i) => {
			els.forEach(el => body.appendChild(el))
		})
	}
	function syncCheckedState() {
		syncFns.forEach(fn => fn())
		updateHeaderHidden()
	}

	function init() {
		const legend = Utils.el("div", {className: "legend-panel is-collapsed", "aria-label": "Map legend"})
		document.getElementById("map").appendChild(legend)

		const {headerEl, collapseBtn, updateHidden} = buildHeader({
			title: "Legend",
			collapseLabel: "Expand legend",
			hiddenCountFn: totalHiddenByFilters
		})
		updateHeaderHidden = updateHidden

		legend.appendChild(headerEl)

		// Starts collapsed (matches the "is-collapsed" class set on `legend`
		// above); kept in sync so the CSS collapse transition in
		// ADD_TO_YOUR_CSS.css has a correct starting point. This wrapper
		// exists purely to give the CSS grid collapse trick a single grid
		// item to animate — `bodyWrap` below (which holds the actual
		// content: actions row, divider, groups) sits inside it unchanged.
		const collapseWrap = Utils.el("div", {className: "legend-panel__collapse", "data-collapsed": "true"})
		legend.appendChild(collapseWrap)

		const bodyWrap = Utils.el("div", {className: "legend-panel__body"})
		collapseWrap.appendChild(bodyWrap)

		const actionsRow = Utils.el("div", {className: "legend__actions", text: "Toggle all:"})
		const defaultBtn = Utils.el("button", {type: "button", className: "legend-panel__action-btn", "aria-label": "Show all features", text: "ON"})
		const noneBtn = Utils.el("button", {type: "button", className: "legend-panel__action-btn", "aria-label": "Hide all features", text: "OFF"})
		defaultBtn.addEventListener("click", () => FilterState.setAllVisible(true))
		noneBtn.addEventListener("click", () => FilterState.setAllVisible(false))
		actionsRow.append(defaultBtn, noneBtn)

		const panel = Utils.el("div", {className: "legend-panel__content", id: "legend-panel__groups"})

		// Static dividers, matching the panel's markup: one before the
		// actions row, one between actions and the groups content.
		bodyWrap.append(divider("divider"), actionsRow, divider("divider"), panel)

		const collapsible = createCollapsible({panelEl: legend, collapseBtn, bodyEl: collapseWrap, expandLabel: "Expand legend", collapseLabel: "Collapse legend"})
		collapseBtn.addEventListener("click", () => collapsible.setCollapsed(!collapsible.isCollapsed()))

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
