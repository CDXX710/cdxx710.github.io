import Theme from "../state/theme.js"
import Shapes from "./shapes.js"
import PopupContent from "./popup-content.js"
import Config from "../config.js"
import FilterState from "../state/filter-state.js"
import MapCore from "../map/map-core.js"
import EventBus from "../event-bus.js"

// ─────────────────────────────────────────────────────────────
// Markers — marker lifecycle: creation, visibility, and lookups
// between a Leaflet marker instance and its archive feature index.
// ─────────────────────────────────────────────────────────────
const Markers = (() => {
	let markers = []
	const indexByMarker = new Map()

	function createMarker(feature, index) {
		const {category, creole, authorType} = feature.properties
		const [lng, lat] = feature.geometry.coordinates
		const fillColor = Theme.categoryColor(category)
		const ringColor = Theme.creoleColor(authorType) ?? fillColor
		const icon = L.divIcon({
			className: "",
			html: Shapes.markerSvg(creole, fillColor, ringColor),
			iconSize: [20, 20],
			iconAnchor: [10, 10]
		})
		const marker = L.marker([lat, lng], {icon})
		marker.bindPopup(PopupContent.build(feature.properties), {maxWidth: Config.popup.maxWidth})
		marker.feature = feature
		indexByMarker.set(marker, index)
		return marker
	}
	function applyVisibility() {
		markers.forEach(marker => {
			const visible = FilterState.isFeatureVisible(marker.feature.properties)
			visible ? marker.addTo(MapCore.map) : MapCore.map.removeLayer(marker)
		})
	}
	function init(features) {
		markers = features.map((feature, index) => {
			const marker = createMarker(feature, index)
			marker.addTo(MapCore.map)
			return marker
		})
		EventBus.on("filters:changed", applyVisibility)
		return markers
	}
	function all() {
		return markers
	}
	function visible() {
		return markers.filter(marker => MapCore.map.hasLayer(marker))
	}
	function featureIndex(marker) {
		return indexByMarker.get(marker)
	}
	return {init, all, visible, featureIndex}
})()

export default Markers
