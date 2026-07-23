// ─────────────────────────────────────────────────────────────
// BoundaryData — loads the boundary polygons once (topojson, if
// present, otherwise a plain geojson FeatureCollection) and hands back
// a flat array of geojson Features. Shared by GeoIndex (point-in-
// polygon lookups) and Boundaries (rendering).
// ─────────────────────────────────────────────────────────────
const BoundaryData = (() => {
	let features = null
	function getFeatures() {
		if (features) return features
		features = typeof BoundariesTopo !== "undefined" ? topojson.feature(BoundariesTopo, BoundariesTopo.objects.carribean).features : typeof BoundariesData !== "undefined" ? BoundariesData.features ?? [] : []
		return features
	}
	return {getFeatures}
})()

export default BoundaryData
