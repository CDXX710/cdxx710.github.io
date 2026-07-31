import Utils from "../../utils.js"

export function createZoomUI(map) {
	const container = map.getContainer()

	const el = Utils.el("div", {className: "zoom-panel"})
	el.innerHTML = Utils.html`
		<button type="button" class="zoom-button" id="zoom-panel__in-btn">+</button>
		<button type="button" class="zoom-button" id="zoom-panel__out-btn">−</button>
	`

	el.querySelector("#zoom-panel__in-btn").addEventListener("click", () => map.zoomIn())
	el.querySelector("#zoom-panel__out-btn").addEventListener("click", () => map.zoomOut())

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
