import Config from "../config.js"
import GeoMath from "../geo-math.js"
import MapCore from "./map-core.js"
import EventBus from "../event-bus.js"
import BoundaryData from "../data/boundary-data.js"
import Utils from "../utils.js"
import SelectionToolbar from "../ui/selection-toolbar.js"

// ─────────────────────────────────────────────────────────────
// Boundaries — renders the boundary polygons (BoundaryData) on the
// map: islands and water features get separate styles, each is
// independently toggleable, and islands carrying a FLAG property get
// a small flag marker at their centroid.
// ─────────────────────────────────────────────────────────────
const Boundaries = (() => {
	const cfg = Config.boundaries
	let islandsLayer = null
	let watersLayer = null
	let flagsLayer = null
	// Water and island features in the TopoJSON share a GID_0. Use that
	// shared identifier to pair each water feature with its corresponding
	// island feature and reuse the island/flag anchor for the water tooltip.
	let anchorByGid0 = new Map()

	function isWater(feature) {
		const raw = feature?.properties?.[cfg.typeProperty]
		if (raw == null) return false
		return cfg.waterTypeValues.includes(String(raw).toLowerCase())
	}
	function nameFor(feature) {
		return feature?.properties?.[cfg.nameProperty] || "Unknown"
	}
	function flagFor(feature) {
		return feature?.properties?.[cfg.flagProperty] || null
	}
	function styleFor(feature) {
		return isWater(feature) ? cfg.water : cfg.island
	}

	// For MultiPolygon islands (archipelagos, small offshore cays sharing
	// one feature) the bbox center of the whole geometry can land in open
	// water. Instead: pick the largest sub-polygon by area (GeoMath) and
	// place the flag at that ring's centroid, falling back to the nearest
	// ring vertex for concave shapes where the centroid itself isn't
	// inside the polygon. Returns a Leaflet [lat, lng] pair.
	function flagLatLng(geometry) {
		const poly = GeoMath.largestPolygon(geometry)
		const outer = poly?.[0]
		if (!outer || !outer.length) return null
		const [cx, cy] = GeoMath.ringCentroid(outer)
		if (GeoMath.pointInPolygonRings(cx, cy, poly)) return [cy, cx]
		let nearest = outer[0],
			nearestDist = Infinity
		for (const [x, y] of outer) {
			const d = (x - cx) ** 2 + (y - cy) ** 2
			if (d < nearestDist) {
				nearestDist = d
				nearest = [x, y]
			}
		}
		return [nearest[1], nearest[0]]
	}

	function flagIcon(url) {
		return L.divIcon({
			className: "boundary-flag-icon",
			html: Utils.html`<img src="${url}" alt="" style="display:block; width:100%; height:100%; object-fit:cover; border-radius:2px; box-shadow:0 0 0 1px rgba(0,0,0,.35), 0 1px 3px rgba(0,0,0,.4);" />`,
			iconSize: [cfg.flagSize, Math.round(cfg.flagSize * 0.667)],
			iconAnchor: [cfg.flagSize / 2, Math.round(cfg.flagSize * 0.333)]
		})
	}

	function onEachFeature(feature, layer) {
		const name = nameFor(feature)
		const baseStyle = styleFor(feature)
		const gid0 = feature?.properties?.GID_0
		// Water and island features form pairs through their shared GID_0.
		// The island side owns the canonical anchor: the same point used by
		// its flag. Water tooltips reuse that exact position.
		const anchor = isWater(feature) && gid0 != null ? anchorByGid0.get(String(gid0)) ?? flagLatLng(feature.geometry) : flagLatLng(feature.geometry)
		let tooltip = null
		layer.on({
			mouseover: () => {
				layer.setStyle({weight: (baseStyle.weight ?? 1) + cfg.hoverWeightBoost})
				if (!anchor) return
				if (!tooltip) {
					tooltip = L.tooltip({
						className: "boundary-tooltip",
						direction: "top",
						offset: [0, -Math.round(cfg.flagSize * 0.4)]
					})
						.setLatLng(anchor)
						.setContent(name)
				}
				tooltip.addTo(MapCore.map)
			},
			mouseout: () => {
				layer.setStyle(baseStyle)
				if (tooltip) MapCore.map.removeLayer(tooltip)
			},
			click: evt => {
				// Object Select owns boundary clicks while armed. Stop the
				// Leaflet event from bubbling to the map or other handlers,
				// while still sending the feature to SelectionToolbar.
				if (SelectionToolbar.isObjectSelectActive()) {
					L.DomEvent.stopPropagation(evt)
					EventBus.emit("boundary:objectClick", feature)
				}
			}
		})
		const flagUrl = flagFor(feature)
		if (flagUrl && !isWater(feature) && anchor) {
			const marker = L.marker(anchor, {icon: flagIcon(flagUrl), keyboard: false})
			marker.bindTooltip(name, {direction: "top", offset: [0, -Math.round(cfg.flagSize * 0.4)], className: "boundary-tooltip"})
			flagsLayer.addLayer(marker)
		}
	}

	function build() {
		const features = BoundaryData.getFeatures()
		flagsLayer = L.layerGroup()

		// Build the shared GID_0 -> island anchor lookup before Leaflet
		// invokes onEachFeature for either layer, so water tooltips sit
		// exactly where the corresponding island flag/tooltip do.
		anchorByGid0 = new Map(
			features
				.filter(feature => !isWater(feature))
				.map(feature => {
					const gid0 = feature?.properties?.GID_0
					return gid0 == null ? null : [String(gid0), flagLatLng(feature.geometry)]
				})
				.filter(entry => entry && entry[1])
		)

		islandsLayer = L.geoJSON({type: "FeatureCollection", features: features.filter(f => !isWater(f))}, {style: styleFor, onEachFeature})
		watersLayer = L.geoJSON({type: "FeatureCollection", features: features.filter(isWater)}, {style: styleFor, onEachFeature})
	}

	function setLayer(layer, visible) {
		if (!layer) return
		if (visible) layer.addTo(MapCore.map)
		else MapCore.map.removeLayer(layer)
	}

	const toggleDefs = [
		{key: "islands", label: "Islands", layer: () => islandsLayer, shapeKind: "unknown", color: () => cfg.island.fillColor, default: true},
		{key: "waters", label: "Waters", layer: () => watersLayer, shapeKind: "ring", color: () => cfg.water.color, default: true},
		{key: "flags", label: "Flags", layer: () => flagsLayer, shapeKind: "about", color: () => "#c9a227", default: cfg.showFlagsByDefault}
	]
	// Consumed by the Legend to render an "Islands / Waters / Flags" group
	// alongside the existing filter groups, rather than a separate floating panel.
	function getToggles() {
		return toggleDefs.map(({key, label, shapeKind, color, default: def}) => ({key, label, shapeKind, color: color(), default: def}))
	}
	function isVisible(key) {
		const def = toggleDefs.find(t => t.key === key)
		const layer = def?.layer()
		return !!layer && MapCore.map.hasLayer(layer)
	}
	function setVisible(key, visible) {
		const def = toggleDefs.find(t => t.key === key)
		if (def) setLayer(def.layer(), visible)
	}
	function init() {
		if (!cfg.enabled) return
		build()
		toggleDefs.forEach(def => {
			if (def.default) setLayer(def.layer(), true)
		})
	}
	return {init, getToggles, isVisible, setVisible}
})()

export default Boundaries
