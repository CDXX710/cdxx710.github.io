import MapCore from "../map/map-core.js"

// ─────────────────────────────────────────────────────────────
// MarkerPopup — replaces L.popup with a fully CSS-controlled DOM
// element positioned manually against the map. All static styling
// (background, radius, tail, shadow, transitions) lives in CSS via
// marker-popup.css. JS only ever sets the computed position
// (left/top) plus toggles state classes/attributes.
// ─────────────────────────────────────────────────────────────
const MarkerPopup = (() => {
	let el = null
	let bodyEl = null
	let currentLatLng = null

	function ensureEl() {
		if (el) return el
		el = document.createElement("div")
		el.className = "marker-popup"

		bodyEl = document.createElement("div")
		bodyEl.className = "marker-popup__body"

		const tailMask = document.createElement("div")
		tailMask.className = "marker-popup__tail-mask"

		el.appendChild(bodyEl)
		el.appendChild(tailMask)

		// stop map drag/zoom from hijacking clicks/scroll inside popup
		L.DomEvent.disableClickPropagation(el)
		L.DomEvent.disableScrollPropagation(el)

		MapCore.map.getContainer().appendChild(el)
		MapCore.map.on("move zoom viewreset", updatePosition)
		return el
	}

	function updatePosition() {
		if (!currentLatLng || !el || !el.classList.contains("is-open")) return
		const point = MapCore.map.latLngToContainerPoint(currentLatLng)
		el.style.left = `${point.x}px`
		el.style.top = `${point.y}px`
	}

	function open(latLng, html, {maxWidth, className} = {}) {
		ensureEl()
		currentLatLng = latLng
		bodyEl.innerHTML = html
		el.style.setProperty("--popup-max-width", maxWidth ? `${maxWidth}px` : "")
		if (className) el.dataset.variant = className
		else delete el.dataset.variant
		el.classList.add("is-open")
		updatePosition()
	}

	function close() {
		if (!el) return
		el.classList.remove("is-open")
		currentLatLng = null
	}

	function isOpen() {
		return !!el && el.classList.contains("is-open")
	}

	return {open, close, isOpen}
})()

export default MarkerPopup
