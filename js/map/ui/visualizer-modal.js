import Panels from "./panels.js"

// ─────────────────────────────────────────────────────────────
// VisualizerModal — the document-viewer overlay, toggled by
// "Read source text" links (which call the global toggleWindowPopup).
// ─────────────────────────────────────────────────────────────
const VisualizerModal = (() => {
	function init() {
		const visualizer = document.getElementById("visualizer")
		Panels.isolateFromMap(visualizer)
		function toggle() {
			visualizer.classList.toggle("show")
		}
		window.toggleWindowPopup = toggle
	}
	return {init}
})()

export default VisualizerModal
