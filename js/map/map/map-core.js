import Config from "../config.js"
import {createZoomUI} from "./controls/custom-zoom.js"

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

	return {
		map,
		getContainer: () => map.getContainer()
	}
})()

export default MapCore
