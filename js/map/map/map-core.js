import Config from "../config.js"
import {createZoomUI} from "./controls/custom-zoom.js"
import EventBus from "../event-bus.js"

// ─────────────────────────────────────────────────────────────
// MapCore — the single Leaflet map instance everything else builds on.
// ─────────────────────────────────────────────────────────────
const MapCore = (() => {
	const map = L.map("map", {
		center: Config.map.center,
		zoom: Config.map.zoom,
		zoomControl: false
	})

	createZoomUI(map)

	// NEW: previously nothing on the bus observed viewport motion, so
	// pan/zoom couldn't be persisted. `moveend` already coalesces an
	// entire pan/zoom gesture into one event (Leaflet doesn't fire it
	// mid-drag), which is exactly the signal StateSyncManager wants.
	map.on("moveend", () => {
		const center = map.getCenter()
		EventBus.emit("viewport:changed", {center: [center.lat, center.lng], zoom: map.getZoom()})
	})

	return {
		map,
		getContainer: () => map.getContainer()
	}
})()

export default MapCore
