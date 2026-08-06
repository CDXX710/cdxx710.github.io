import Config from "../config.js"

// ─────────────────────────────────────────────────────────────
// BoundaryData — loads the boundary polygons (topojson, if present,
// otherwise a plain geojson FeatureCollection) and hands back a flat
// array of geojson Features. Shared by GeoIndex (island name lookups
// via boundsForIsland) and Boundaries (rendering).
//
// Two precomputed simplification levels of the topology are available
// (BoundariesTopoFine / BoundariesTopoCoarse — see boundaries-topo.js),
// sharing arc indices 1:1, so callers can request whichever level suits
// the current zoom without changing anything else. Each level's decoded
// features are cached independently after first use.
// ─────────────────────────────────────────────────────────────
const BoundaryData = (() => {
	const featuresByLevel = new Map()

	function levelForZoom(zoom) {
		if (typeof zoom !== "number") return "fine"
		return zoom >= Config.boundaries.simplifyZoomThreshold ? "fine" : "coarse"
	}
	function topologyForLevel(level) {
		if (level === "coarse" && typeof BoundariesTopoCoarse !== "undefined") return BoundariesTopoCoarse
		if (typeof BoundariesTopoFine !== "undefined") return BoundariesTopoFine
		// Back-compat: a plain single-level BoundariesTopo (pre-simplification).
		return typeof BoundariesTopo !== "undefined" ? BoundariesTopo : null
	}
	function decode(level) {
		if (featuresByLevel.has(level)) return featuresByLevel.get(level)
		const topology = topologyForLevel(level)
		const features = topology ? topojson.feature(topology, topology.objects.carribean).features : typeof BoundariesData !== "undefined" ? BoundariesData.features ?? [] : []
		featuresByLevel.set(level, features)
		return features
	}
	// `zoom` is optional; omitting it (or passing none) resolves to the fine
	// level, e.g. for one-off lookups like GeoIndex.boundsForIsland that
	// aren't tied to the current viewport zoom.
	function getFeatures(zoom) {
		return decode(levelForZoom(zoom))
	}
	return {getFeatures, levelForZoom}
})()

export default BoundaryData
