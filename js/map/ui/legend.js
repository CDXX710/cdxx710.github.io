import Utils from "../utils.js"
import Shapes from "../markers/shapes.js"
import Theme from "../state/theme.js"
import FilterState from "../state/filter-state.js"
import Boundaries from "../map/boundaries.js"
import EventBus from "../event-bus.js"

// ─────────────────────────────────────────────────────────────
// Legend — the "On map / Filters" legend panel. Presentation only;
// every toggle reads/writes through FilterState or Boundaries.
// ─────────────────────────────────────────────────────────────
const Legend = (() => {
	// Registered by each built row; called on `filters:changed` to sync
	// checked/is-off state without tearing down and rebuilding the panel.
	let syncFns = []

	function isolateFromMap(el) {
		L.DomEvent.disableScrollPropagation(el)
		L.DomEvent.disableClickPropagation(el)
	}

	const collapseChevronSvg = Utils.html`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="2,9 7,4 12,9" /></svg>`

	// Builds a "<title> ...... <collapse button>" header row.
	function buildHeader({title, collapseLabel}) {
		const headerEl = Utils.el("div", {className: "legend-panel__header"})
		if (title) headerEl.appendChild(Utils.el("span", {className: "legend-panel__title", text: title}))
		const collapseBtn = Utils.el("button", {
			className: "collapse-btn legend-panel__collapse-btn",
			"aria-label": collapseLabel,
			"aria-expanded": "false",
			html: collapseChevronSvg
		})
		headerEl.appendChild(collapseBtn)
		return {headerEl, collapseBtn}
	}

	// Collapse/expand for the legend body. The expand/collapse height
	// transition itself is handled entirely in CSS off the `data-collapsed`
	// attribute on `bodyEl` (see ADD_TO_YOUR_CSS.css) — this only ever
	// toggles that attribute plus the associated aria state, never
	// measures or writes an element's height from JS.
	function createCollapsible({panelEl, headerEl, collapseBtn, bodyEl, collapsedClass = "is-collapsed", expandLabel, collapseLabel, extraDividers = []}) {
		let dividerEl = null
		function ensureDivider() {
			if (!dividerEl && headerEl) {
				dividerEl = Utils.el("div", {className: "legend-panel__divider", role: "separator"})
				headerEl.insertAdjacentElement("afterend", dividerEl)
			}
			return dividerEl
		}
		function setCollapsed(collapsed) {
			panelEl.classList.toggle(collapsedClass, collapsed)
			bodyEl.dataset.collapsed = String(collapsed)
			collapseBtn.setAttribute("aria-expanded", String(!collapsed))
			collapseBtn.setAttribute("aria-label", collapsed ? expandLabel : collapseLabel)
			if (!collapsed) {
				const divider = ensureDivider()
				if (divider) divider.hidden = false
				extraDividers.forEach(el => {
					el.hidden = false
				})
			} else {
				if (dividerEl) dividerEl.hidden = true
				extraDividers.forEach(el => {
					el.hidden = true
				})
			}
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
	function divider() {
		return Utils.el("div", {className: "legend__divider", role: "separator"})
	}

	const creoleRoleEntries = [
		{key: "using", label: "Using creoles", shapeKind: "using"},
		{key: "about", label: "About creoles", shapeKind: "about"},
		{key: "unknown", label: "Unknown", shapeKind: "unknown"}
	]
	// `presentKeys` can limit a group to a specific set of keys; currently
	// always called with null (render every possible key). Kept as a
	// parameter in case a filtered view is reintroduced later.
	function creoleRoleGroup(body, presentKeys) {
		const entries = creoleRoleEntries.filter(({key}) => !presentKeys || presentKeys.has(key))
		if (!entries.length) return false
		body.appendChild(groupTitle("Creole"))
		entries.forEach(({key, label, shapeKind}) => {
			body.appendChild(
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
		})
		return true
	}
	function authorTypeGroup(body, presentKeys) {
		const entries = Object.entries(Theme.authorTypeColors).filter(([key]) => !presentKeys || presentKeys.has(key))
		if (!entries.length) return false
		body.appendChild(groupTitle("Author type"))
		entries.forEach(([typeKey, color]) => {
			body.appendChild(
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
		})
		return true
	}
	function categoryGroup(body, presentKeys) {
		const entries = Object.entries(Theme.categoryColors).filter(([key]) => !presentKeys || presentKeys.has(key))
		if (!entries.length) return false
		body.appendChild(groupTitle("Document type"))
		entries.forEach(([catKey, color]) => {
			body.appendChild(
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
		})
		return true
	}
	function layersGroup(body) {
		const toggles = Boundaries.getToggles()
		if (!toggles.length) return false
		body.appendChild(groupTitle("Layers"))
		toggles.forEach(({key, label, shapeKind, color}) => {
			body.appendChild(
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
		})
		return true
	}
	function buildPanel(body) {
		syncFns = []
		body.innerHTML = ""
		const groupBuilders = [b => layersGroup(b), b => creoleRoleGroup(b, null), b => authorTypeGroup(b, null), b => categoryGroup(b, null)]
		groupBuilders.forEach(build => {
			const before = body.children.length
			const added = build(body)
			if (added && before > 0) body.insertBefore(divider(), body.children[before])
		})
	}
	function syncCheckedState() {
		syncFns.forEach(fn => fn())
	}

	function init() {
		const legend = Utils.el("div", {className: "legend-panel is-collapsed", "aria-label": "Map legend"})
		document.getElementById("map").appendChild(legend)

		const {headerEl, collapseBtn} = buildHeader({
			title: "Legend",
			collapseLabel: "Expand legend"
		})

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

		const actionsRow = Utils.el("div", {className: "legend__actions"})
		const defaultBtn = Utils.el("button", {type: "button", className: "legend-panel__action-btn", "aria-label": "Show all features", text: "Default"})
		const noneBtn = Utils.el("button", {type: "button", className: "legend-panel__action-btn", "aria-label": "Hide all features", text: "Clear"})
		defaultBtn.addEventListener("click", () => FilterState.setAllVisible(true))
		noneBtn.addEventListener("click", () => FilterState.setAllVisible(false))
		actionsRow.append(defaultBtn, noneBtn)
		bodyWrap.appendChild(actionsRow)

		const actionsDivider = Utils.el("div", {className: "legend-panel__divider", role: "separator"})
		bodyWrap.appendChild(actionsDivider)

		const panel = Utils.el("div", {className: "legend-panel__content", id: "legend-panel__groups"})
		bodyWrap.append(panel)

		const collapsible = createCollapsible({panelEl: legend, headerEl, collapseBtn, bodyEl: collapseWrap, expandLabel: "Expand legend", collapseLabel: "Collapse legend", extraDividers: [actionsDivider]})
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

		isolateFromMap(legend)
	}
	return {init}
})()

export default Legend
