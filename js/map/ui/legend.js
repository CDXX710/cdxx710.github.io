import Utils from "../utils.js"
import Shapes from "../markers/shapes.js"
import Theme from "../state/theme.js"
import FilterState from "../state/filter-state.js"
import Boundaries from "../map/boundaries.js"
import Panels from "./panels.js"
import Markers from "../markers/markers.js"
import EventBus from "../event-bus.js"

// ─────────────────────────────────────────────────────────────
// Legend — the "On map / Filters" legend panel. Presentation only;
// every toggle reads/writes through FilterState or Boundaries.
// ─────────────────────────────────────────────────────────────
const Legend = (() => {
	function toggleRow({id, label, shapeKind, initialColor, checked = true, onChange}) {
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
					onChange: isOn => FilterState.setCreoleRoleActive(key, isOn)
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
					onChange: isOn => FilterState.setAuthorTypeActive(typeKey, isOn)
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
					onChange: isOn => FilterState.setCategoryActive(catKey, isOn)
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
					onChange: isOn => Boundaries.setVisible(key, isOn)
				})
			)
		})
		return true
	}
	function buildPanel(body) {
		body.innerHTML = ""
		const groupBuilders = [b => layersGroup(b), b => creoleRoleGroup(b, null), b => authorTypeGroup(b, null), b => categoryGroup(b, null)]
		groupBuilders.forEach(build => {
			const before = body.children.length
			const added = build(body)
			if (added && before > 0) body.insertBefore(divider(), body.children[before])
		})
	}

	function init() {
		const legend = Utils.el("div", {className: "map-legend is-collapsed", "aria-label": "Map legend"})
		document.getElementById("map").appendChild(legend)

		const {headerEl, collapseBtn} = Panels.buildHeader({
			title: "Legend",
			collapseLabel: "Expand legend"
		})

		legend.appendChild(headerEl)

		const bodyWrap = Utils.el("div", {className: "legend__body"})
		legend.appendChild(bodyWrap)

		const actionsRow = Utils.el("div", {className: "legend__actions"})
		const defaultBtn = Utils.el("button", {type: "button", className: "selection-results__clear legend__action-btn", "aria-label": "Show all features", text: "Default"})
		const noneBtn = Utils.el("button", {type: "button", className: "selection-results__clear legend__action-btn", "aria-label": "Hide all features", text: "Clear"})
		defaultBtn.addEventListener("click", () => FilterState.setAllVisible(true))
		noneBtn.addEventListener("click", () => FilterState.setAllVisible(false))
		actionsRow.append(defaultBtn, noneBtn)
		bodyWrap.appendChild(actionsRow)

		const actionsDivider = Utils.el("div", {className: "__divider", role: "separator"})
		bodyWrap.appendChild(actionsDivider)

		const panel = Utils.el("div", {className: "legend__body", id: "legend-panel"})
		bodyWrap.append(panel)

		const collapsible = Panels.createCollapsible({panelEl: legend, headerEl, collapseBtn, bodyEl: bodyWrap, expandLabel: "Expand legend", collapseLabel: "Collapse legend", extraDividers: [actionsDivider]})
		collapseBtn.addEventListener("click", () => collapsible.setCollapsed(!collapsible.isCollapsed()))

		function resizeIfExpanded() {
			if (!collapsible.isCollapsed()) bodyWrap.style.maxHeight = `${bodyWrap.scrollHeight}px`
		}
		function renderPanel() {
			buildPanel(panel)
			resizeIfExpanded()
		}

		renderPanel()
		// Keep the panel honest as filters/time-range change which markers are
		// actually rendered.
		EventBus.on("filters:changed", renderPanel)

		Panels.isolateFromMap(legend)
	}
	return {init}
})()

export default Legend
