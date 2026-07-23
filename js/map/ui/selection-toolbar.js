import Markers from "../markers/markers.js"
import GeoMath from "../geo-math.js"
import MapCore from "../map/map-core.js"
import DrawOverlay from "../map/draw-overlay.js"
import SelectionState from "../state/selection-state.js"
import EventBus from "../event-bus.js"
import Config from "../config.js"
import Panels from "./panels.js"

// ─────────────────────────────────────────────────────────────
// SelectionToolbar — shape/object selection tools and the drag-to-
// select interaction that drives them. Drawing input is handled through
// unified Pointer Events (one code path for mouse, touch, and pen)
// rather than parallel mouse/touch handler pairs.
// ─────────────────────────────────────────────────────────────
const SelectionToolbar = (() => {
	const hitTesters = {
		rectangle: (start, end) => Markers.visible().filter(marker => GeoMath.inRectangle(containerPoint(marker), start, end)),
		ellipse: (start, end) => Markers.visible().filter(marker => GeoMath.inEllipse(containerPoint(marker), start, end)),
		lasso: points => Markers.visible().filter(marker => GeoMath.inPolygon(containerPoint(marker), points)),
		polygon: points => (points.length < 3 ? [] : Markers.visible().filter(marker => GeoMath.inPolygon(containerPoint(marker), points)))
	}

	function objectHits(feature, mode) {
		const geometry = feature?.geometry
		if (!geometry) return []

		if (mode === "extent") {
			const [minX, minY, maxX, maxY] = GeoMath.geometryBBox(geometry)
			return Markers.visible().filter(marker => {
				const {lat, lng} = marker.getLatLng()
				return lng >= minX && lng <= maxX && lat >= minY && lat <= maxY
			})
		}

		return Markers.visible().filter(marker => {
			const {lat, lng} = marker.getLatLng()
			return GeoMath.pointInGeometry(lng, lat, geometry)
		})
	}

	let toolbarEl
	let shapeButtons
	let modeButtons
	let objectModeButtons

	let armedShape = null
	let objectMode = "extent"

	let isDrawing = false
	let drawPoints = []
	let drawStart = null
	let lastPointerDownTime = 0

	function containerPoint(marker) {
		return MapCore.map.latLngToContainerPoint(marker.getLatLng())
	}
	function relativePoint(evt) {
		const rect = MapCore.getContainer().getBoundingClientRect()
		return {x: evt.clientX - rect.left, y: evt.clientY - rect.top}
	}

	/*
	 * Returns true when Object Select is currently active.
	 * Use this from polygon/marker click handlers to decide whether
	 * their normal click behaviour should be suppressed.
	 */
	function isObjectSelectActive() {
		return armedShape === "object"
	}

	/*
	 * Stops a Leaflet event from reaching parent layers/map handlers.
	 * Call this from the actual polygon/marker layer click handler,
	 * not from the map container handler below.
	 */
	function stopObjectSelectPropagation(evt) {
		if (!isObjectSelectActive()) return false
		if (evt) {
			if (typeof L !== "undefined" && L.DomEvent) L.DomEvent.stopPropagation(evt)
			if (evt.originalEvent) {
				evt.originalEvent.preventDefault?.()
				evt.originalEvent.stopPropagation?.()
			} else {
				evt.preventDefault?.()
				evt.stopPropagation?.()
			}
		}
		return true
	}

	function arm(shape) {
		armedShape = shape
		shapeButtons.forEach(btn => btn.classList.toggle("is-active", btn.dataset.shape === shape))
		toolbarEl.classList.add("is-armed")
		toolbarEl.classList.toggle("is-object", shape === "object")
		MapCore.getContainer().classList.add("is-drawing-select")
		MapCore.map.dragging.disable()
		MapCore.map.doubleClickZoom.disable()
		if (MapCore.map.tap) MapCore.map.tap.disable()
	}

	function disarm() {
		armedShape = null
		shapeButtons.forEach(btn => btn.classList.remove("is-active"))
		toolbarEl.classList.remove("is-armed", "is-object")
		MapCore.getContainer().classList.remove("is-drawing-select")
		MapCore.map.dragging.enable()
		MapCore.map.doubleClickZoom.enable()
		if (MapCore.map.tap) MapCore.map.tap.enable()
		cancelDraw()
	}

	function cancelDraw() {
		isDrawing = false
		drawPoints = []
		drawStart = null
		DrawOverlay.clear()
	}

	function finishDraw() {
		let hits = []
		if (armedShape === "rectangle" && drawStart) hits = hitTesters.rectangle(drawStart, drawPoints[drawPoints.length - 1] ?? drawStart)
		else if (armedShape === "ellipse" && drawStart) hits = hitTesters.ellipse(drawStart, drawPoints[drawPoints.length - 1] ?? drawStart)
		else if (armedShape === "lasso") hits = hitTesters.lasso(drawPoints)
		else if (armedShape === "polygon") hits = hitTesters.polygon(drawPoints)

		SelectionState.applyHits(hits.map(Markers.featureIndex))
		EventBus.emit("selection:toolUsed")
		cancelDraw()
	}

	// Any floating UI (toolbar, both legend-style panels, the selection
	// list, the searchbar) sits on top of the map but lives inside the
	// same container element the draw handlers listen on. None of these
	// should ever be treated as "drawing on the map", regardless of
	// which tool is armed — arming a tool must only affect the map
	// surface itself (markers/tiles/boundaries), never this chrome.
	function isOutsideDrawSurface(evt) {
		return !!evt.target.closest("#map-select-toolbar, .selection-results, .map-legend, #map-searchbar, .map-basemap-control")
	}

	// Unified pointer handling: mouse, touch, and pen all funnel through
	// these three, replacing what used to be six near-duplicate mouse/
	// touch handlers. Polygon points are placed on each pointerdown;
	// two pointerdowns within Config.polygonCloseTapMs close the shape —
	// this covers a mouse double-click and a touch double-tap alike.
	// Object select never draws anything itself (it reacts to
	// EventBus "boundary:objectClick" instead), so it's excluded here
	// rather than falling through into the rectangle/ellipse/lasso
	// draw-state by accident.
	function onPointerDown(evt) {
		if (!armedShape || armedShape === "object" || isOutsideDrawSurface(evt)) return
		if (evt.pointerType !== "mouse") evt.preventDefault()

		const point = relativePoint(evt)

		if (armedShape === "polygon") {
			const now = Date.now()
			const isCloseTap = isDrawing && now - lastPointerDownTime < Config.polygonCloseTapMs
			lastPointerDownTime = now

			if (isCloseTap) {
				finishDraw()
				return
			}

			if (!isDrawing) {
				isDrawing = true
				drawPoints = [point]
			} else {
				drawPoints.push(point)
			}
			DrawOverlay.path([...drawPoints], true)
			return
		}

		isDrawing = true
		drawStart = point
		drawPoints = [point]
	}

	function onPointerMove(evt) {
		if (!isDrawing || !armedShape || armedShape === "object") return
		if (evt.pointerType !== "mouse") evt.preventDefault()

		const point = relativePoint(evt)

		if (armedShape === "rectangle") {
			drawPoints = [drawStart, point]
			DrawOverlay.rectangle(drawStart, point)
		} else if (armedShape === "ellipse") {
			drawPoints = [drawStart, point]
			DrawOverlay.ellipse(drawStart, point)
		} else if (armedShape === "lasso") {
			drawPoints.push(point)
			DrawOverlay.path(drawPoints, false)
		} else if (armedShape === "polygon") {
			DrawOverlay.path([...drawPoints, point], true)
		}
	}

	function onPointerUp(evt) {
		if (!isDrawing || !armedShape || armedShape === "polygon" || armedShape === "object") return
		if (evt.pointerType !== "mouse") evt.preventDefault()
		finishDraw()
	}

	function onKeyDown(evt) {
		if (evt.key === "Escape" && armedShape) disarm()
	}

	function init() {
		toolbarEl = document.getElementById("selectToolbar")
		shapeButtons = Array.from(document.querySelectorAll(".select-toolbar__btn[data-shape]"))
		modeButtons = Array.from(document.querySelectorAll(".select-toolbar__btn[data-mode]"))
		objectModeButtons = Array.from(document.querySelectorAll(".select-toolbar__btn[data-object-mode]"))

		Panels.isolateFromMap(document.getElementById("map-select-toolbar"))

		shapeButtons.forEach(btn => {
			btn.addEventListener("click", () => (armedShape === btn.dataset.shape ? disarm() : arm(btn.dataset.shape)))
		})
		modeButtons.forEach(btn => {
			btn.addEventListener("click", () => {
				SelectionState.setMode(btn.dataset.mode)
				modeButtons.forEach(b => b.classList.toggle("is-active", b === btn))
			})
		})
		objectModeButtons.forEach(btn => {
			btn.addEventListener("click", () => {
				objectMode = btn.dataset.objectMode
				objectModeButtons.forEach(b => b.classList.toggle("is-active", b === btn))
			})
		})

		// Clicking an island/water boundary while the Object select tool is armed
		// selects the archive markers inside it (exact geometry or bounding
		// extent, per objectMode), combined via whichever mode button is active.
		EventBus.on("boundary:objectClick", feature => {
			if (!isObjectSelectActive()) return
			const hits = objectHits(feature, objectMode)
			SelectionState.applyHits(hits.map(Markers.featureIndex))
			EventBus.emit("selection:toolUsed")
		})

		const container = MapCore.getContainer()
		container.addEventListener("pointerdown", onPointerDown, {passive: false})
		container.addEventListener("pointermove", onPointerMove, {passive: false})
		container.addEventListener("pointerup", onPointerUp, {passive: false})
		container.addEventListener("pointercancel", cancelDraw)
		document.addEventListener("keydown", onKeyDown)
	}

	return {init, isObjectSelectActive, stopObjectSelectPropagation}
})()

export default SelectionToolbar
