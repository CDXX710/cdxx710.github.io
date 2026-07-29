export function createZoomUI(map) {
	const container = map.getContainer()

	const el = document.createElement("div")
	el.className = "zoom-panel"

	const zoomIn = document.createElement("button")
	zoomIn.className = "zoom-button"
	zoomIn.type = "button"
	zoomIn.textContent = "+"

	const zoomOut = document.createElement("button")
	zoomOut.className = "zoom-button"
	zoomOut.type = "button"
	zoomOut.textContent = "−"

	el.append(zoomIn, zoomOut)

	zoomIn.addEventListener("click", () => {
		map.zoomIn()
	})

	zoomOut.addEventListener("click", () => {
		map.zoomOut()
	})

	// Prevent Leaflet map interactions
	L.DomEvent.disableClickPropagation(el)
	L.DomEvent.disableScrollPropagation(el)

	container.appendChild(el)

	return {
		element: el,
		destroy() {
			el.remove()
		}
	}
}
