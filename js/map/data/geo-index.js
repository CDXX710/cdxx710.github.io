import BoundaryData from "./boundary-data.js"
import GeoMath from "../geo-math.js"
import ArchiveData from "./archive-data.js"

// ─────────────────────────────────────────────────────────────
// GeoIndex — looks up the island/territory for each archive record, so
// "Geographic Distribution" can report real place names instead of raw
// coordinates. Each archive feature now carries its island directly via
// `properties.location`, so this is a plain read rather than a runtime
// point-in-polygon lookup against the boundary polygons.
// ─────────────────────────────────────────────────────────────
const GeoIndex = (() => {
	const unmappedLabel = "Unmapped"

	// Full-resolution admin boundaries can have thousands of vertices per
	// island; testing every ring on every lookup is the main cost. A cheap
	// bounding-box pre-check (computed once, cached) rejects almost every
	// polygon before the expensive ray-cast ever runs. Still needed here for
	// boundsForIsland, which pans/zooms the map to a given island's extent.
	let indexedBoundaries = null
	function getIndexedBoundaries() {
		if (indexedBoundaries) return indexedBoundaries
		indexedBoundaries = BoundaryData.getFeatures().map(feature => ({feature, bbox: GeoMath.geometryBBox(feature.geometry)}))
		return indexedBoundaries
	}

	function islandFor(index) {
		return ArchiveData.features[index]?.properties?.location || unmappedLabel
	}
	// Combined lat/lng bounds for every boundary feature matching a given
	// island name, so the UI can pan/zoom the map to that island.
	function boundsForIsland(name) {
		if (name === unmappedLabel) return null
		const matches = getIndexedBoundaries().filter(({feature}) => feature?.properties?.NAME_0 === name)
		if (!matches.length) return null
		const [minX, minY, maxX, maxY] = matches.reduce((acc, {bbox}) => [Math.min(acc[0], bbox[0]), Math.min(acc[1], bbox[1]), Math.max(acc[2], bbox[2]), Math.max(acc[3], bbox[3])], [Infinity, Infinity, -Infinity, -Infinity])
		if (!isFinite(minX)) return null
		return [
			[minY, minX],
			[maxY, maxX]
		]
	}
	return {islandFor, boundsForIsland, unmappedLabel}
})()

export default GeoIndex
