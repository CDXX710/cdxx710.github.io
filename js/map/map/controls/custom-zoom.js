import {isolateFromMap} from "../../dom-utils.js"

// ─────────────────────────────────────────────────────────────
// Zoom control — markup lives statically in map.html (#zoom-panel);
// this just wires up behavior.
// ─────────────────────────────────────────────────────────────
export function createZoomUI(map) {
	const el = document.getElementById("zoom-panel")

	el.querySelector("#zoom-panel__in-btn").addEventListener("click", () => map.zoomIn())
	el.querySelector("#zoom-panel__out-btn").addEventListener("click", () => map.zoomOut())

	isolateFromMap(el)

	return {
		element: el,
		destroy() {
			el.remove()
		}
	}
}
