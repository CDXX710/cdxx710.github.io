import Theme from "../state/theme.js"
import Shapes from "./shapes.js"
import PopupContent from "./popup-content.js"
import MarkerPopup from "./marker-popup.js"
import Config from "../config.js"
import FilterState from "../state/filter-state.js"
import SelectionState from "../state/selection-state.js"
import MapCore from "../map/map-core.js"
import EventBus from "../event-bus.js"

// ─────────────────────────────────────────────────────────────
// Markers — marker lifecycle: creation, visibility, and lookups
// between a Leaflet marker instance and its archive feature index.
// ─────────────────────────────────────────────────────────────
const Markers = (() => {
	let markers = []
	const indexByMarker = new Map()
	let visibleCache = null
	// While a search query is active, only its matching (selected) markers
	// should be shown on the map; every other panel that drives SelectionState
	// (lasso/box select, results panel, …) keeps highlighting selected markers
	// in place rather than hiding the rest, so this stays search-only.
	let searchActive = false

	function invalidateVisibleCache() {
		visibleCache = null
	}

	function createMarker(feature, index) {
		const {category, creole, authorType} = feature.properties
		const [lng, lat] = feature.geometry.coordinates
		const fillColor = Theme.categoryColor(category)
		const ringColor = Theme.authorTypeColor(authorType) ?? fillColor
		const icon = L.divIcon({
			className: "marker-icon",
			html: Shapes.markerSvg(creole, fillColor, ringColor),
			iconSize: [24, 24],
			iconAnchor: [12, 12]
		})
		const marker = L.marker([lat, lng], {icon, keyboard: true, alt: feature.properties.name})
		const openPopup = () => {
			MarkerPopup.open(marker.getLatLng(), PopupContent.build(feature.properties), {
				maxWidth: Config.popup.maxWidth
			})
		}
		marker.on("click", openPopup)
		marker.on("add", () => {
			const el = marker.getElement()
			if (!el) return
			el.setAttribute("role", "button")
			el.setAttribute("tabindex", "0")
			el.addEventListener("keydown", event => {
				if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
					event.preventDefault()
					openPopup()
				}
			})
		})
		marker.feature = feature
		indexByMarker.set(marker, index)
		return marker
	}
	function applyVisibility() {
		markers.forEach(marker => {
			const visible = FilterState.isFeatureVisible(marker.feature.properties) && (!searchActive || SelectionState.has(indexByMarker.get(marker)))
			visible ? marker.addTo(MapCore.map) : MapCore.map.removeLayer(marker)
		})
		invalidateVisibleCache()
	}
	function init(features) {
		markers = features.map((feature, index) => {
			const marker = createMarker(feature, index)
			marker.addTo(MapCore.map)
			return marker
		})
		EventBus.on("filters:changed", applyVisibility)
		EventBus.on("selection:changed", applyVisibility)
		EventBus.on("search:queryChanged", isActive => {
			searchActive = isActive
			applyVisibility()
		})
		MapCore.map.on("click", () => MarkerPopup.close())
		return markers
	}
	function all() {
		return markers
	}
	function visible() {
		if (!visibleCache) visibleCache = markers.filter(marker => MapCore.map.hasLayer(marker))
		return visibleCache
	}
	function featureIndex(marker) {
		return indexByMarker.get(marker)
	}
	return {init, all, visible, featureIndex}
})()

export default Markers
