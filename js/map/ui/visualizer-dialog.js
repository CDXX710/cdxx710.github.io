import Utils from "../utils.js"
import visualizerPlaceholderContent from "../data/visualizer-content.js"

// ─────────────────────────────────────────────────────────────
// VisualizerModal — the document-viewer overlay, toggled by
// "Read source text" links (which call the global toggleWindowPopup).
// ─────────────────────────────────────────────────────────────
const VisualizerModal = (() => {
	let visualizerEl = null
	let contentNodes = []

	function isolateFromMap(el) {
		L.DomEvent.disableScrollPropagation(el)
		L.DomEvent.disableClickPropagation(el)
	}

	function handleVisualizerKeydown(event) {
		if (event.key === "Escape") hide()
	}
	function buildVisualizer() {
		const el = Utils.el("div", {className: "visualizer-dialog"})
		el.innerHTML = Utils.html` <div class="visualizer-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="visualizerTitle">
                                    	<div class="visualizer-dialog__header">
                                    		<h2 class="visualizer-dialog__title" id="visualizerTitle">Source text</h2>
                                    		<button type="button" class="panel-close" aria-label="Close">×</button>
                                    	</div>
                                    	<div class="visualizer-dialog__body"></div>
                                    </div>`
		el.querySelector(".visualizer-dialog__body").append(...contentNodes)
		el.querySelector(".panel-close").addEventListener("click", hide)
		el.addEventListener("click", event => {
			if (event.target === el) hide()
		})
		return el
	}
	function show() {
		if (visualizerEl) return
		visualizerEl = buildVisualizer()
		isolateFromMap(visualizerEl)
		document.addEventListener("keydown", handleVisualizerKeydown)
		document.getElementById("map").appendChild(visualizerEl)
	}
	function hide() {
		if (!visualizerEl) return
		// hand content back to storage before the dialog (and its DOM) is discarded,
		// so the next show() has something to render
		contentNodes = Array.from(visualizerEl.querySelector(".visualizer-dialog__body").childNodes)
		document.removeEventListener("keydown", handleVisualizerKeydown)
		visualizerEl.remove()
		visualizerEl = null
	}
	function toggle() {
		if (visualizerEl) hide()
		else show()
	}
	function init() {
		const parsed = Utils.el("div", {html: visualizerPlaceholderContent})
		contentNodes = Array.from(parsed.childNodes)
		window.toggleWindowPopup = toggle
	}
	return {init}
})()

export default VisualizerModal
