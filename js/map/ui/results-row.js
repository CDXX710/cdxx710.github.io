import Utils from "../utils.js"
import ArchiveData from "../data/archive-data.js"
import Markers from "../markers/markers.js"
import Shapes from "../markers/shapes.js"
import Theme from "../state/theme.js"
import MapCore from "../map/map-core.js"
import Config from "../config.js"
import MarkerPopup from "../markers/marker-popup.js"
import PopupContent from "../markers/popup-content.js"

// ─────────────────────────────────────────────────────────────
// buildResultRow — renders a single row in the results list and
// wires up its click-to-fly-to-marker behaviour.
// ─────────────────────────────────────────────────────────────
function buildResultRow(index) {
	const feature = ArchiveData.features[index]
	const marker = Markers.all()[index]
	const {name, time, category, authorType} = feature.properties
	const color = Theme.categoryColor(category)

	const row = Utils.el("div", {className: "result-row"})
	row.innerHTML = Utils.html` <div class="result-row__left">
                                    	<span class="result-row__dot">${Shapes.categorySvg(category, color)}</span>
                                    	<span class="result-row__name">${name}</span>
                                    </div>
                                    <div class="result-row__body">
                                    	<span class="result-row__year">${time}</span>
                                    	<span class="result-row__meta">${authorType ? Utils.capitalize(authorType) + " " : ""}${Utils.capitalize(category)}</span>
                                    </div>`

	row.addEventListener("click", () => {
		MapCore.map.flyTo(marker.getLatLng(), Math.max(MapCore.map.getZoom(), Config.flyTo.minZoom))
		MarkerPopup.open(marker.getLatLng(), PopupContent.build(feature.properties), {
			maxWidth: Config.popup.maxWidth
		})
	})

	return row
}

export default buildResultRow
