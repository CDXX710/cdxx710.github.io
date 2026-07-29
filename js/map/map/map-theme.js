import EventBus from "../event-bus.js"

const mapTheme = (() => {
	function apply(name) {
		document.documentElement.dataset.theme = name

		EventBus.emit("theme:changed", name)
	}

	function init() {
		EventBus.on("basemap:baseChanged", layer => {
			document.documentElement.dataset.theme = layer.theme
		})
	}

	return {
		init,
		apply
	}
})()

export default mapTheme
