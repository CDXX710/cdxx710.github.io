import Theme from "../state/theme.js"
import Shapes from "./shapes.js"
import PopupContent from "./popup-content.js"
import MarkerPopup from "./marker-popup.js"
import Config from "../config.js"
import ArchiveData from "../data/archive-data.js"
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

	// True (the default) once more than one creoleRole remains under
	// the active filters — markers then use their role's own brand
	// colour, since role is the useful thing to highlight. Flips to
	// false once filtering leaves only a single creoleRole visible, at
	// which point role has nothing left to distinguish and markers
	// fall back to their category colour instead (same icon either
	// way — see Shapes.markerSvg). Recomputed on every filters:changed,
	// since that's the only thing that can change which roles remain.
	let highlightByRole = true

	function invalidateVisibleCache() {
		visibleCache = null
	}

	// Scans every record (not just currently-created markers) against
	// the active filters to see how many distinct creoleRoles would
	// remain visible. Bails out as soon as a 2nd role is found.
	function computeHighlightByRole() {
		const rolesPresent = new Set()
		for (const feature of ArchiveData.features) {
			if (!FilterState.isFeatureVisible(feature.properties)) continue
			rolesPresent.add(FilterState.roleKeyFor(feature.properties.creole))
			if (rolesPresent.size > 1) return true
		}
		return false
	}

	function buildIcon(properties) {
		const roleKey = FilterState.roleKeyFor(properties.creole)
		const fillColor = highlightByRole ? Theme.roleColor(roleKey) : Theme.categoryColor(properties.category)
		return L.divIcon({
			className: "marker-icon",
			html: Shapes.markerSvg(roleKey, fillColor),
			iconSize: [24, 24],
			iconAnchor: [12, 12]
		})
	}

	// Re-derives highlightByRole from the current filters and, if it
	// actually changed, restyles every existing marker in place
	// (visibility is untouched — that's applyVisibility's job).
	function refreshIconMode() {
		const next = computeHighlightByRole()
		if (next === highlightByRole) return
		highlightByRole = next
		markers.forEach(marker => marker.setIcon(buildIcon(marker.feature.properties)))
	}

	function createMarker(feature, index) {
		const icon = buildIcon(feature.properties)
		const [lng, lat] = feature.geometry.coordinates
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
		highlightByRole = computeHighlightByRole()
		markers = features.map((feature, index) => {
			const marker = createMarker(feature, index)
			marker.addTo(MapCore.map)
			return marker
		})
		EventBus.on("filters:changed", () => {
			refreshIconMode()
			applyVisibility()
		})
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
