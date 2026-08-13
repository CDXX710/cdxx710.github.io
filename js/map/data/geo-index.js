import BoundaryData from "./boundary-data.js"
import GeoMath from "../geo-math.js"
import ArchiveData from "./archive-data.js"
import Config from "../config.js"

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

	// GID_0 -> island NAME_0, and NAME_0 -> GID_0, both built once.
	// A territory's water polygon has a different NAME_0 ("Dominican
	// Waters") than its island polygon ("Dominica"), but the two share
	// GID_0 — that's the correct merge key. SOVEREIGN doesn't work
	// here: French territories like Guadeloupe and Martinique both
	// have SOVEREIGN "France", which would wrongly merge separate
	// islands together instead of just merging each island with its
	// own surrounding waters.
	let gid0ByName = null
	let islandNameByGid0 = null
	function isWaterFeature(feature) {
		const raw = feature?.properties?.[Config.boundaries.typeProperty]
		return raw != null && Config.boundaries.waterTypeValues.includes(String(raw).toLowerCase())
	}
	function buildGidLookups() {
		if (gid0ByName) return
		const features = BoundaryData.getFeatures()
		gid0ByName = new Map(features.map(f => [f?.properties?.[Config.boundaries.nameProperty], f?.properties?.GID_0]))
		islandNameByGid0 = new Map(features.filter(f => !isWaterFeature(f)).map(f => [f?.properties?.GID_0, f?.properties?.[Config.boundaries.nameProperty]]))
	}

	function islandFor(index) {
		const raw = ArchiveData.features[index]?.properties?.location
		if (!raw) return unmappedLabel
		buildGidLookups()
		const gid0 = gid0ByName.get(raw)
		return (gid0 != null && islandNameByGid0.get(gid0)) || raw
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
	// The flag URL for a given island name (same NAME_0 matching as
	// boundsForIsland), for anywhere the UI wants to show a country
	// flag next to an island — e.g. AnalyticsPanel's "Top islands".
	// Not every island carries a FLAG property, so this can return null.
	function flagForIsland(name) {
		if (name === unmappedLabel) return null
		const match = BoundaryData.getFeatures().find(feature => feature?.properties?.[Config.boundaries.nameProperty] === name)
		return match?.properties?.[Config.boundaries.flagProperty] || null
	}
	return {islandFor, boundsForIsland, flagForIsland, unmappedLabel}
})()

export default GeoIndex
