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
	let listEl, countEl, sortInputEl, collapsible

	function currentSortKey() {
		return sortInputEl.value
	}
	function sortedIndices() {
		const indices = SelectionState.indices()
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
	function render() {
		const count = SelectionState.size()
		countEl.textContent = String(count)
		listEl.innerHTML = ""
		if (count === 0) return
		sortedIndices().forEach(index => listEl.appendChild(buildRow(index)))
	}
	function init() {
		const panelEl = document.getElementById("selectionResults")
		const collapseBtn = document.getElementById("selectionCollapseBtn")
		listEl = document.getElementById("selectionList")
		countEl = document.getElementById("selectionCount")
		sortInputEl = document.getElementById("selectionSortValue")
		Panels.isolateFromMap(panelEl)
		collapsible = Panels.createCollapsible({panelEl, collapseBtn, expandLabel: "Expand selection panel", collapseLabel: "Collapse selection panel"})
		document.getElementById("selectionClearBtn").addEventListener("click", () => SelectionState.clear())
		collapseBtn.addEventListener("click", () => collapsible.setCollapsed(!collapsible.isCollapsed()))
		collapsible.setCollapsed(true)
		let previousCount = 0
		EventBus.on("selection:changed", () => {
			highlightSelectedMarkers()
			render()
			const count = SelectionState.size()
			if (count === 0) collapsible.setCollapsed(true)
			else if (previousCount === 0) collapsible.setCollapsed(false)
			previousCount = count
		})
		EventBus.on("selection:toolUsed", () => {
			if (SelectionState.size() > 0) collapsible.setCollapsed(false)
		})
	}
	function refresh() {
		render()
	}
	return {init, refresh}
})()

export default SelectionResults
