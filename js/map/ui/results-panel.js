import Utils from "../utils.js"
import SelectionState from "../state/selection-state.js"
import ArchiveData from "../data/archive-data.js"
import Markers from "../markers/markers.js"
import Theme from "../state/theme.js"
import MapCore from "../map/map-core.js"
import Config from "../config.js"
import Panels from "./panels.js"
import EventBus from "../event-bus.js"

// ─────────────────────────────────────────────────────────────
// SelectionResults — the selected-records list panel: sorting,
// rendering rows, and keeping selected markers visually highlighted.
// ─────────────────────────────────────────────────────────────
const SelectionResults = (() => {
	const sorters = {
		date: (a, b) => Utils.compareNullsLast(a.properties.time, b.properties.time, (x, y) => x - y),
		documentType: (a, b) => Utils.compareNullsLast(a.properties.category, b.properties.category, (x, y) => x.localeCompare(y)),
		authorType: (a, b) => Utils.compareNullsLast(a.properties.authorType, b.properties.authorType, (x, y) => x.localeCompare(y)),
		name: (a, b) => Utils.compareNullsLast(a.properties.name, b.properties.name, (x, y) => x.localeCompare(y))
	}
	let listEl, countEl, sortInputEl, collapsible, titleBtn, titleLabelEl
	let showAllInBbox = true
	let recordsInView = 0
	let exportOverlayEl = null

	const exportCategories = [
		{
			label: "Map",
			formats: [
				{value: "jpg", label: "JPG", hint: "Best for quick sharing and lightweight printable maps"},
				{value: "png", label: "PNG", hint: "High‑quality printable map with sharp details"},
				{value: "svg", label: "SVG", hint: "Scalable vector map ideal for editing and design tools"},
				{value: "pdf", label: "PDF", hint: "Print‑ready map with perfect layout and resolution"}
			]
		},
		{
			label: "GIS / Data",
			formats: [
				{value: "csv", label: "CSV", hint: "Spreadsheet-ready tabular data"},
				{value: "json", label: "JSON", hint: "Structured data for apps and APIs"},
				{value: "geojson", label: "GeoJSON", hint: "Geospatial features with geometry + properties"},
				{value: "topojson", label: "TopoJSON", hint: "Compact, topology-aware GeoJSON"},
				{value: "kml", label: "KML", hint: "Google Earth–friendly geospatial format"},
				{value: "shp", label: "ShapeFile", hint: "Classic ESRI format"},
				{value: "gpkg", label: "GeoPKG", hint: "Modern OGC GeoPackage for portable GIS data"},
				{value: "fgb", label: "FlatGeobuf", hint: "High-performance binary geospatial format"}
			]
		}
	]

	function currentSortKey() {
		return sortInputEl.value
	}
	function featureInBounds(feature, bounds) {
		const [lng, lat] = feature.geometry.coordinates
		return bounds.contains([lat, lng])
	}
	function visibleIndices() {
		const bounds = MapCore.map.getBounds()
		const indices = []
		ArchiveData.features.forEach((feature, index) => {
			if (featureInBounds(feature, bounds)) indices.push(index)
		})
		return indices
	}
	function activeIndices() {
		return showAllInBbox ? visibleIndices() : SelectionState.indices()
	}
	function sortedIndices() {
		const indices = activeIndices()
		const comparator = sorters[currentSortKey()]
		if (!comparator) return indices.sort((a, b) => a - b)
		return indices.sort((a, b) => comparator(ArchiveData.features[a], ArchiveData.features[b]))
	}
	function buildRow(index) {
		const feature = ArchiveData.features[index]
		const marker = Markers.all()[index]
		const {name, time, category, authorType} = feature.properties
		const color = Theme.categoryColor(category)
		const row = Utils.el("div", {className: "result-row"})
		row.innerHTML = Utils.html` <div class="result-row__left">
                                    	<svg class="result-row__dot" viewBox="0 0 14 14" aria-hidden="true">
                                    		<circle cx="7" cy="7" r="6" fill="${color}" />
                                    	</svg>
                                    	<span class="result-row__name">${name}</span>
                                    </div>
                                    <div class="result-row__body">
                                    	<span class="result-row__year">${time}</span>
                                    	<span class="result-row__meta">${authorType ? Utils.capitalize(authorType) + " " : ""}${Utils.capitalize(category)}</span>
                                    </div>`
		row.addEventListener("click", () => {
			MapCore.map.flyTo(marker.getLatLng(), Math.max(MapCore.map.getZoom(), Config.flyTo.minZoom))
			marker.openPopup()
		})
		return row
	}
	function highlightSelectedMarkers() {
		Markers.all().forEach(marker => {
			const isSelected = SelectionState.has(Markers.featureIndex(marker))
			const iconEl = marker.getElement?.() ?? marker._icon
			iconEl?.classList.toggle("is-selected-marker", isSelected)
		})
	}
	const count = document.getElementById("resultsCount")
	function updateTitle() {
		countEl.textContent = String(showAllInBbox ? recordsInView : SelectionState.size())
		titleLabelEl.textContent = showAllInBbox ? "Visible:" : "Selection:"
		titleBtn.setAttribute("aria-pressed", String(showAllInBbox))
		if (showAllInBbox === true) {
			count.classList.add("visible"), count.classList.remove("selection")
		} else {
			count.classList.add("selection"), count.classList.remove("visible")
		}
	}
	function render() {
		updateTitle()
		listEl.innerHTML = ""
		if (activeIndices().length === 0) return
		sortedIndices().forEach(index => listEl.appendChild(buildRow(index)))
	}
	function selectAll() {
		// applyHits() combines using the currently active tool mode (add/subtract/
		// intersect/…), but "select all" should always replace the selection
		// outright — so we force "new" mode for this one call, then restore
		// whatever mode was active before.
		const previousMode = SelectionState.getMode()
		const allIndices = ArchiveData.features.map((_, index) => index)
		SelectionState.setMode("new")
		SelectionState.applyHits(allIndices)
		SelectionState.setMode(previousMode)
	}
	function buildFormatOption(format, name) {
		const option = Utils.el("label", {className: "export-format-option"})
		option.innerHTML = Utils.html` <span class="export-format-option__box" aria-hidden="true"></span>
                                        <span class="export-format-option__text">
                                        	<span class="export-format-option__label">${format.label}</span>
                                        	<span class="export-format-option__hint">${format.hint}</span>
                                        </span>`
		const input = Utils.el("input", {type: "checkbox", className: "export-format-option__input", name})
		input.value = format.value
		option.prepend(input)
		input.addEventListener("change", () => {
			if (!input.checked) {
				input.checked = true // behave like a radio: can't uncheck the active one directly
				return
			}
			option
				.closest(".export-overlay__formats")
				.querySelectorAll("input")
				.forEach(other => {
					if (other !== input) other.checked = false
				})
		})
		return {option, input}
	}
	function closeExportOverlay() {
		exportOverlayEl?.remove()
		exportOverlayEl = null
		document.removeEventListener("keydown", handleExportOverlayKeydown)
	}
	function handleExportOverlayKeydown(event) {
		if (event.key === "Escape") closeExportOverlay()
	}
	function openExportOverlay() {
		if (exportOverlayEl) return
		exportOverlayEl = Utils.el("div", {className: "export-overlay"})
		exportOverlayEl.innerHTML = Utils.html` <div class="export-overlay__dialog" role="dialog" aria-modal="true" aria-labelledby="exportOverlayTitle">
                                                	<div class="export-overlay__header">
                                                		<h2 class="export-overlay__title" id="exportOverlayTitle">Export selection</h2>
                                                		<button type="button" class="panel-close" aria-label="Close">×</button>
                                                	</div>
                                                	<p class="export-overlay__subtitle">Choose a format for the exported records.</p>
                                                	<div class="export-overlay__formats"></div>
                                                	<div class="export-overlay__footer">
                                                		<button type="button" class="export-overlay__cancel">Cancel</button>
                                                		<button type="button" class="export-overlay__confirm">Export</button>
                                                	</div>
                                                </div>`
		const formatsEl = exportOverlayEl.querySelector(".export-overlay__formats")
		let isFirstOption = true
		exportCategories.forEach(category => {
			const categoryEl = Utils.el("div", {className: "export-overlay__category"})
			categoryEl.innerHTML = Utils.html`<h3 class="export-overlay__category-title">${category.label}</h3>`
			const optionsEl = Utils.el("div", {className: "export-overlay__category-options"})
			category.formats.forEach(format => {
				const {option, input} = buildFormatOption(format, "exportFormat")
				if (isFirstOption) {
					input.checked = true
					isFirstOption = false
				}
				optionsEl.appendChild(option)
			})
			categoryEl.appendChild(optionsEl)
			formatsEl.appendChild(categoryEl)
		})
		exportOverlayEl.querySelector(".panel-close").addEventListener("click", closeExportOverlay)
		exportOverlayEl.querySelector(".export-overlay__cancel").addEventListener("click", closeExportOverlay)
		exportOverlayEl.querySelector(".export-overlay__confirm").addEventListener("click", closeExportOverlay)
		exportOverlayEl.addEventListener("click", event => {
			if (event.target === exportOverlayEl) closeExportOverlay()
		})
		document.addEventListener("keydown", handleExportOverlayKeydown)
		document.getElementById("map").appendChild(exportOverlayEl)
	}
	function toggleMode() {
		showAllInBbox = !showAllInBbox
		render()
		if (showAllInBbox) collapsible.setCollapsed(false)
		else if (SelectionState.size() === 0) collapsible.setCollapsed(true)
	}
	function init() {
		const panelEl = document.getElementById("resultsPanel")
		titleBtn = panelEl.querySelector(".results-panel__title")
		countEl = document.getElementById("resultsCount")
		titleLabelEl = document.getElementById("resultsTitleLabel")
		const collapseBtn = document.getElementById("resultsCollapseBtn")
		sortInputEl = document.getElementById("resultsSortValue")
		listEl = document.getElementById("resultsList")
		Panels.isolateFromMap(panelEl)
		collapsible = Panels.createCollapsible({panelEl, collapseBtn, expandLabel: "Expand selection panel", collapseLabel: "Collapse selection panel"})
		document.getElementById("selectionClearBtn").addEventListener("click", () => SelectionState.clear())
		document.getElementById("selectAllBtn").addEventListener("click", selectAll)
		document.getElementById("selectionExportBtn").addEventListener("click", openExportOverlay)
		collapseBtn.addEventListener("click", () => collapsible.setCollapsed(!collapsible.isCollapsed()))
		titleBtn.addEventListener("click", toggleMode)
		collapsible.setCollapsed(false)
		let previousCount = 0
		EventBus.on("selection:changed", () => {
			highlightSelectedMarkers()
			if (showAllInBbox) return
			render()
			const count = SelectionState.size()
			if (count === 0) collapsible.setCollapsed(true)
			else if (previousCount === 0) collapsible.setCollapsed(false)
			previousCount = count
		})
		EventBus.on("selection:toolUsed", () => {
			if (showAllInBbox) {
				showAllInBbox = false
				render()
			}
			if (SelectionState.size() > 0) collapsible.setCollapsed(false)
		})
		EventBus.on("analytics:recordsInViewChanged", count => {
			recordsInView = count
			if (showAllInBbox) updateTitle()
		})
		MapCore.map.on("moveend", () => {
			if (showAllInBbox) render()
		})
		render()
	}
	function refresh() {
		render()
	}
	return {init, refresh}
})()

export default SelectionResults
