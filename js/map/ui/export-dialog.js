import Utils from "../utils.js"
import {isolateFromMap} from "../dom-utils.js"

// ─────────────────────────────────────────────────────────────
// ExportDialog — the "choose a format and export" dialog.
// Self-contained: owns its own DOM, focus/escape handling, and
// format-option (radio-like checkbox) behaviour.
// ─────────────────────────────────────────────────────────────

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

const ExportDialog = (() => {
	let dialogEl = null

	function handleKeydown(event) {
		if (event.key === "Escape") close()
	}

	function close() {
		dialogEl?.remove()
		dialogEl = null
		document.removeEventListener("keydown", handleKeydown)
	}

	function buildFormatOption(format, groupName) {
		const option = Utils.el("label", {className: "export-format-option"})
		option.innerHTML = Utils.html` <span class="export-format-option__box" aria-hidden="true"></span>
                                        <span class="export-format-option__text">
                                        	<span class="export-format-option__label">${format.label}</span>
                                        	<span class="export-format-option__hint">${format.hint}</span>
                                        </span>`

		const input = Utils.el("input", {type: "checkbox", className: "export-format-option__input", name: groupName})
		input.value = format.value
		option.prepend(input)

		input.addEventListener("change", () => {
			if (!input.checked) {
				input.checked = true // behave like a radio: can't uncheck the active one directly
				return
			}
			option
				.closest(".export-dialog__formats")
				.querySelectorAll("input")
				.forEach(other => {
					if (other !== input) other.checked = false
				})
		})

		return {option, input}
	}

	function buildCategorySection(category) {
		const categoryEl = Utils.el("div", {className: "export-dialog__category"})
		categoryEl.innerHTML = Utils.html`<h3 class="export-dialog__category-title">${category.label}</h3>`

		const optionsEl = Utils.el("div", {className: "export-dialog__category-options"})
		category.formats.forEach((format, formatIndex) => {
			const {option, input} = buildFormatOption(format, "exportFormat")
			if (formatIndex === 0 && category === exportCategories[0]) input.checked = true
			optionsEl.appendChild(option)
		})

		categoryEl.appendChild(optionsEl)
		return categoryEl
	}

	function open() {
		if (dialogEl) return

		dialogEl = Utils.el("div", {className: "export-dialog"})
		dialogEl.innerHTML = Utils.html` <div class="export-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="export-dialog-title">
                                                	<div class="export-dialog__header">
                                                		<h2 class="export-dialog__title" id="export-dialog-title">Export selection</h2>
                                                		<button type="button" class="panel-close" aria-label="Close">×</button>
                                                	</div>
                                                	<p class="export-dialog__subtitle">Choose a format for the exported records.</p>
                                                	<div class="export-dialog__formats"></div>
                                                	<div class="export-dialog__footer">
                                                		<button type="button" class="export-dialog__cancel">Cancel</button>
                                                		<button type="button" class="export-dialog__confirm">Export</button>
                                                	</div>
                                                </div>`

		// Isolate the dialog from the map so clicks/scrolls don't leak through
		isolateFromMap(dialogEl)

		const formatsEl = dialogEl.querySelector(".export-dialog__formats")
		exportCategories.forEach(category => formatsEl.appendChild(buildCategorySection(category)))

		dialogEl.querySelector(".panel-close").addEventListener("click", close)
		dialogEl.querySelector(".export-dialog__cancel").addEventListener("click", close)
		dialogEl.querySelector(".export-dialog__confirm").addEventListener("click", close)
		dialogEl.addEventListener("mousedown", event => {
			if (event.target === dialogEl) event.preventDefault()
		})
		dialogEl.addEventListener("click", event => {
			if (event.target === dialogEl) close()
		})

		document.addEventListener("keydown", handleKeydown)
		document.getElementById("map").appendChild(dialogEl)
	}

	return {open, close}
})()

export default ExportDialog
