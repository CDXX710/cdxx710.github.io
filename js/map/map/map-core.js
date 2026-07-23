import Config from "../config.js"

// ─────────────────────────────────────────────────────────────
// MapCore — the single Leaflet map instance everything else builds on.
// ─────────────────────────────────────────────────────────────
const MapCore = (() => {
	const map = L.map("map", {center: Config.map.center, zoom: Config.map.zoom, zoomControl: true})
	return {map, getContainer: () => map.getContainer()}
})()

export default MapCore
