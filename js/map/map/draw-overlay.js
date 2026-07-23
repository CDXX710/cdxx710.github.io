import MapCore from "./map-core.js"
import GeoMath from "../geo-math.js"

// ─────────────────────────────────────────────────────────────
// DrawOverlay — the single rubber-band shape (box/ellipse/path) drawn
// on top of the map while a selection tool is armed and dragging.
// ─────────────────────────────────────────────────────────────
const DrawOverlay = (() => {
	let el = null
	function ensureBoxEl(className) {
		if (!el || el.tagName !== "DIV") {
			clear()
			el = document.createElement("div")
			MapCore.getContainer().appendChild(el)
		}
		el.className = className
		return el
	}
	function ensureSvgEl() {
		if (!el || el.tagName.toLowerCase() !== "svg") {
			clear()
			el = document.createElementNS("http://www.w3.org/2000/svg", "svg")
			el.classList.add("select-draw-svg")
			el.innerHTML = '<path d="" />'
			MapCore.getContainer().appendChild(el)
		}
		return el
	}
	function box(className, start, end) {
		const node = ensureBoxEl(className)
		const x = Math.min(start.x, end.x),
			y = Math.min(start.y, end.y)
		node.style.left = `${x}px`
		node.style.top = `${y}px`
		node.style.width = `${Math.abs(end.x - start.x)}px`
		node.style.height = `${Math.abs(end.y - start.y)}px`
	}
	function rectangle(start, end) {
		box("select-draw-shape", start, end)
	}
	function ellipse(start, end) {
		box("select-draw-shape select-draw-shape--ellipse", start, end)
	}
	function path(points, close) {
		const node = ensureSvgEl()
		node.querySelector("path").setAttribute("d", GeoMath.pointsToPath(points, close))
	}
	function clear() {
		el?.remove()
		el = null
	}
	return {rectangle, ellipse, path, clear}
})()

export default DrawOverlay
