import Markers from "../markers/markers.js"
import GeoMath from "../geo-math.js"
import MapCore from "../map/map-core.js"
import DrawOverlay from "../map/draw-overlay.js"
import SelectionState from "../state/selection-state.js"
import EventBus from "../event-bus.js"
import Config from "../config.js"

// ─────────────────────────────────────────────────────────────
// SelectionToolbar — shape/object selection tools and the drag-to-
// select interaction that drives them. Drawing input is handled through
// unified Pointer Events (one code path for mouse, touch, and pen)
// rather than parallel mouse/touch handler pairs.
// ─────────────────────────────────────────────────────────────
const SelectionToolbar = (() => {
	function isolateFromMap(el) {
		L.DomEvent.disableScrollPropagation(el)
		L.DomEvent.disableClickPropagation(el)
	}
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

	// Arming a shape tool calls MapCore.map.dragging.disable(), which turns
	// off Leaflet's native panning entirely (left-drag is repurposed for
	// drawing). Middle-click panning should still work while armed, so it's
	// driven manually here rather than through Leaflet's dragging handler.
	// Similarly to native drag, it just slides the map pane's CSS transform directly
	// and only reconciles Leaflet's real state once, at drag end.
	let isMiddlePanning = false
	let middlePanLast = null
	let middlePanAccum = null
	let middlePanRaf = null
	let middlePanOrigTransform = null
	let middlePanOrigPos = null

	function getPanePos() {
		// map._getMapPanePos() is a private Leaflet method but is the
		// standard way plugins read the pane's current pixel offset.
		if (typeof MapCore.map._getMapPanePos === "function") return MapCore.map._getMapPanePos()
		const match = /translate3d\(\s*(-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px/.exec(mapPane.style.transform || "")
		return match ? {x: parseFloat(match[1]), y: parseFloat(match[2])} : {x: 0, y: 0}
	}

	function applyPaneOffset(dx, dy) {
		mapPane.style.transform = `translate3d(${middlePanOrigPos.x + dx}px, ${middlePanOrigPos.y + dy}px, 0)`
	}

	function flushMiddlePan() {
		middlePanRaf = null
		if (!isMiddlePanning || !middlePanAccum) return
		applyPaneOffset(middlePanAccum.x, middlePanAccum.y)
	}

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

	const map = MapCore.map
	const mapPane = map.getPanes().mapPane

	function arm(shape) {
		armedShape = shape
		shapeButtons.forEach(btn => btn.classList.toggle("is-active", btn.dataset.shape === shape))
		toolbarEl.classList.add("is-armed")
		toolbarEl.classList.toggle("is-object", shape === "object")
		mapPane.classList.add("is-armed")
		mapPane.classList.toggle("is-object", shape === "object")
		MapCore.getContainer().classList.add("is-drawing")
		// Belt-and-braces alongside the CSS class: touch-action is resolved by
		// the browser before pointer events are dispatched, so if the class-based
		// rule loses a specificity battle (or applies a tick too late on some
		// browsers), a drag can still get claimed as a native scroll/pan and the
		// very first pointermove arrives as a pointercancel instead. Setting it
		// inline here guarantees it's in effect the instant the tool is armed.
		MapCore.getContainer().style.touchAction = "none"
		MapCore.map.dragging.disable()
		MapCore.map.doubleClickZoom.disable()
		if (MapCore.map.tap) MapCore.map.tap.disable()
		EventBus.emit("selection:toolArmed", {shape: armedShape})
	}

	function disarm() {
		armedShape = null
		shapeButtons.forEach(btn => btn.classList.remove("is-active"))
		toolbarEl.classList.remove("is-armed", "is-object")
		mapPane.classList.remove("is-armed", "is-object")
		MapCore.getContainer().classList.remove("is-drawing")
		MapCore.getContainer().style.touchAction = ""
		MapCore.map.dragging.enable()
		MapCore.map.doubleClickZoom.enable()
		if (MapCore.map.tap) MapCore.map.tap.enable()
		cancelDraw()
		EventBus.emit("selection:toolArmed", {shape: armedShape})
	}

	function cancelDraw() {
		isDrawing = false
		drawPoints = []
		drawStart = null
		if (isMiddlePanning && middlePanOrigTransform != null) mapPane.style.transform = middlePanOrigTransform
		isMiddlePanning = false
		middlePanLast = null
		middlePanAccum = null
		middlePanOrigTransform = null
		middlePanOrigPos = null
		if (middlePanRaf != null) {
			cancelAnimationFrame(middlePanRaf)
			middlePanRaf = null
		}
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

	// Arming a tool must only affect the map surface itself (markers/tiles/boundaries), never this chrome.
	function isOutsideDrawSurface(evt) {
		return !!evt.target.closest(".visualizer-dialog, .export-dialog, .searchbar-panel, .select-toolbar__row, .results-panel, .zoom-panel, .basemap-panel, .legend-panel, .analytics-panel, .marker-popup")
	}

	// Unified pointer handling: mouse, touch, and pen all funnel through
	// these three.
	// Object select never draws anything itself (it reacts to
	// EventBus "boundary:objectClick" instead), so it's excluded here
	// rather than falling through into the rectangle/ellipse/lasso
	// draw-state by accident.
	function onPointerDown(evt) {
		if (evt.button === 1 && armedShape && armedShape !== "object" && !isOutsideDrawSurface(evt)) {
			isMiddlePanning = true
			middlePanLast = {x: evt.clientX, y: evt.clientY}
			middlePanAccum = {x: 0, y: 0}
			middlePanOrigTransform = mapPane.style.transform
			middlePanOrigPos = getPanePos()
			evt.preventDefault()
			return
		}

		if (!armedShape || armedShape === "object" || isOutsideDrawSurface(evt)) return
		if (evt.button != null && evt.button !== 0) return
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
		if (isMiddlePanning) {
			evt.preventDefault()
			const dx = evt.clientX - middlePanLast.x
			const dy = evt.clientY - middlePanLast.y
			middlePanLast = {x: evt.clientX, y: evt.clientY}
			middlePanAccum.x += dx
			middlePanAccum.y += dy
			if (middlePanRaf == null) middlePanRaf = requestAnimationFrame(flushMiddlePan)
			return
		}

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
		if (evt.button === 1 && isMiddlePanning) {
			if (middlePanRaf != null) {
				cancelAnimationFrame(middlePanRaf)
				middlePanRaf = null
			}
			const {x, y} = middlePanAccum
			// Undo the hand-rolled transform first so panBy starts from the
			// pane position Leaflet actually thinks it's at, then let Leaflet
			// commit the real offset in one shot (fires move/moveend once).
			mapPane.style.transform = middlePanOrigTransform
			isMiddlePanning = false
			middlePanLast = null
			middlePanAccum = null
			middlePanOrigTransform = null
			middlePanOrigPos = null
			if (x || y) MapCore.map.panBy([-x, -y], {animate: false, duration: 0})
			return
		}

		if (!isDrawing || !armedShape || armedShape === "polygon" || armedShape === "object") return
		if (evt.pointerType !== "mouse") evt.preventDefault()
		finishDraw()
	}

	function onKeyDown(evt) {
		if (evt.key === "Escape" && armedShape) disarm()
	}

	function init() {
		toolbarEl = document.getElementById("select-toolbar")
		shapeButtons = Array.from(document.querySelectorAll(".select-toolbar__btn[data-shape]"))
		modeButtons = Array.from(document.querySelectorAll(".select-toolbar__btn[data-mode]"))
		objectModeButtons = Array.from(document.querySelectorAll(".select-toolbar__btn[data-object-mode]"))

		isolateFromMap(document.getElementById("select-toolbar-panel"))

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

		MapCore.map.on("click", () => {
			if (!isObjectSelectActive()) return
			SelectionState.applyHits([])
			EventBus.emit("selection:toolUsed")
		})

		const container = MapCore.getContainer()
		container.addEventListener("pointerdown", onPointerDown, {passive: false})
		container.addEventListener("pointermove", onPointerMove, {passive: false})
		container.addEventListener("pointerup", onPointerUp, {passive: false})
		container.addEventListener("pointercancel", cancelDraw)
		document.addEventListener("keydown", onKeyDown)
	}

	return {init, isObjectSelectActive}
})()

export default SelectionToolbar
