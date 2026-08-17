import EventBus from "../event-bus.js"

// ─────────────────────────────────────────────────────────────
// mapTheme — keeps [data-theme] on <html> in sync with the active
// base layer, so CSS can theme the whole page (not just the map)
// off a single attribute.
// ─────────────────────────────────────────────────────────────
const mapTheme = (() => {
	function init() {
		EventBus.on("basemap:baseChanged", layer => {
			document.documentElement.dataset.theme = layer.theme
		})
	}

	return {init}
})()

export default mapTheme
