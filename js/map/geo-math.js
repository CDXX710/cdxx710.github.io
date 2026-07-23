// ─────────────────────────────────────────────────────────────
// GeoMath — the single source of truth for every hit-test used in the
// app, in both screen-pixel space (drag-to-select shapes) and
// geographic lng/lat space (boundary polygons). Previously this ray-
// casting logic was copy-pasted independently in three different
// modules (GeoIndex, Boundaries, SelectionToolbar) with no shared
// implementation; everything now funnels through here.
// ─────────────────────────────────────────────────────────────
const GeoMath = (() => {
	// ---- screen-space (drag-to-select shapes) -----------------------
	function inRectangle(point, start, end) {
		const minX = Math.min(start.x, end.x),
			maxX = Math.max(start.x, end.x)
		const minY = Math.min(start.y, end.y),
			maxY = Math.max(start.y, end.y)
		return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
	}
	function inEllipse(point, start, end) {
		const cx = (start.x + end.x) / 2,
			cy = (start.y + end.y) / 2
		const rx = Math.abs(end.x - start.x) / 2,
			ry = Math.abs(end.y - start.y) / 2
		if (rx === 0 || ry === 0) return false
		const dx = (point.x - cx) / rx,
			dy = (point.y - cy) / ry
		return dx * dx + dy * dy <= 1
	}
	function inPolygon(point, vertices) {
		let inside = false
		for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
			const vi = vertices[i],
				vj = vertices[j]
			const intersects = vi.y > point.y !== vj.y > point.y && point.x < ((vj.x - vi.x) * (point.y - vi.y)) / (vj.y - vi.y) + vi.x
			if (intersects) inside = !inside
		}
		return inside
	}
	function pointsToPath(points, close) {
		if (!points.length) return ""
		const [first, ...rest] = points
		const segs = rest.map(p => `L ${p.x} ${p.y}`).join(" ")
		return `M ${first.x} ${first.y} ${segs}${close ? " Z" : ""}`
	}

	// ---- geo-space (boundary polygons, lng/lat) ----------------------
	function pointInRing(lng, lat, ring) {
		let inside = false
		for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
			const [xi, yi] = ring[i]
			const [xj, yj] = ring[j]
			if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
		}
		return inside
	}
	// `rings[0]` is the outer boundary; any further rings are holes.
	function pointInPolygonRings(lng, lat, rings) {
		if (!rings.length || !pointInRing(lng, lat, rings[0])) return false
		for (let h = 1; h < rings.length; h++) if (pointInRing(lng, lat, rings[h])) return false
		return true
	}
	function pointInGeometry(lng, lat, geometry) {
		if (!geometry) return false
		if (geometry.type === "Polygon") return pointInPolygonRings(lng, lat, geometry.coordinates)
		if (geometry.type === "MultiPolygon") return geometry.coordinates.some(poly => pointInPolygonRings(lng, lat, poly))
		return false
	}
	// Bounding box, in lng/lat, of a geometry's outer ring(s) only (holes
	// never extend a shape's bbox, so they're irrelevant here).
	function geometryBBox(geometry) {
		const outerRings = geometry?.type === "Polygon" ? [geometry.coordinates[0]] : geometry?.type === "MultiPolygon" ? geometry.coordinates.map(p => p[0]) : []
		let minX = Infinity,
			minY = Infinity,
			maxX = -Infinity,
			maxY = -Infinity
		for (const ring of outerRings) {
			for (const [x, y] of ring) {
				if (x < minX) minX = x
				if (x > maxX) maxX = x
				if (y < minY) minY = y
				if (y > maxY) maxY = y
			}
		}
		return [minX, minY, maxX, maxY]
	}
	function bboxContains([minX, minY, maxX, maxY], lng, lat) {
		return lng >= minX && lng <= maxX && lat >= minY && lat <= maxY
	}
	function ringArea(ring) {
		let sum = 0
		for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) sum += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
		return sum / 2
	}
	function ringCentroid(ring) {
		let cx = 0,
			cy = 0,
			area = 0
		for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
			const [xj, yj] = ring[j],
				[xi, yi] = ring[i]
			const cross = xj * yi - xi * yj
			area += cross
			cx += (xj + xi) * cross
			cy += (yj + yi) * cross
		}
		area /= 2
		if (Math.abs(area) < 1e-12) {
			const n = ring.length || 1
			const [sx, sy] = ring.reduce((acc, [x, y]) => [acc[0] + x, acc[1] + y], [0, 0])
			return [sx / n, sy / n]
		}
		return [cx / (6 * area), cy / (6 * area)]
	}
	// Picks the largest sub-polygon (by outer-ring area) out of a Polygon
	// or MultiPolygon geometry — used to anchor a flag/label on the main
	// landmass of an archipelago rather than some tiny offshore cay.
	function largestPolygon(geometry) {
		const polygons = geometry?.type === "Polygon" ? [geometry.coordinates] : geometry?.type === "MultiPolygon" ? geometry.coordinates : []
		let best = null,
			bestArea = -Infinity
		for (const poly of polygons) {
			const area = Math.abs(ringArea(poly[0] || []))
			if (area > bestArea) {
				bestArea = area
				best = poly
			}
		}
		return best
	}

	return {
		inRectangle,
		inEllipse,
		inPolygon,
		pointsToPath,
		pointInRing,
		pointInPolygonRings,
		pointInGeometry,
		geometryBBox,
		bboxContains,
		ringArea,
		ringCentroid,
		largestPolygon
	}
})()

export default GeoMath
