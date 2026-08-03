import Basemaps from "./map/basemaps.js"
import Boundaries from "./map/boundaries.js"
import VisualizerModal from "./ui/visualizer-dialog.js"
import Markers from "./markers/markers.js"
import ArchiveData from "./data/archive-data.js"
import Legend from "./ui/legend-panel.js"
import TimeSlider from "./ui/time-slider-footer.js"
import SelectionToolbar from "./ui/selection-toolbar.js"
import SelectionResults from "./ui/results-panel.js"
import Searchbar from "./ui/searchbar-panel.js"
import AnalyticsPanel from "./ui/analytics-panel.js"
import CustomDropdown from "./ui/custom-dropdown.js"
import mapTheme from "./map/map-theme.js"
import EventBus from "./event-bus.js"
// ─────────────────────────────────────────────────────────────
// App — bootstraps every module, in dependency order.
// ─────────────────────────────────────────────────────────────

function bootstrap() {
	mapTheme.init()
	Basemaps.init()
	Boundaries.init()
	VisualizerModal.init()
	Markers.init(ArchiveData.features)
	Legend.init()
	TimeSlider.init()
	SelectionToolbar.init()
	SelectionResults.init()
	Searchbar.init()
	AnalyticsPanel.init()
	document.querySelectorAll("[data-dropdown-root]").forEach(rootEl => {
		CustomDropdown.init(rootEl, {onSelect: value => EventBus.emit("sort:changed", value)})
	})
}

bootstrap()
