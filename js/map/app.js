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
import StateSyncManager from "./state/state-sync-manager.js"
// ─────────────────────────────────────────────────────────────
// App — bootstraps every module, in dependency order.
// ─────────────────────────────────────────────────────────────

function bootstrap() {
	// mapTheme must subscribe before Basemaps.init() calls setBase() —
	// that first call is what puts the initial [data-theme] on <html>.
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
		const dropdown = CustomDropdown.init(rootEl, {onSelect: value => EventBus.emit("sort:changed", value)})
		// Keeps the dropdown's own visual selection in sync whenever
		// "sort:changed" fires from anywhere — a real user click (already
		// visually in sync, so this is a harmless no-op) or a restored
		// URL/history state (where it's the only thing that moves the
		// dropdown's label/highlighted option to match).
		EventBus.on("sort:changed", value => dropdown?.selectValue(value))
	})
	// Must run last: it reads every other module's just-initialized
	// default state to compute what "default" means, then may
	// immediately override that state from the URL.
	StateSyncManager.initialize()
}

bootstrap()
