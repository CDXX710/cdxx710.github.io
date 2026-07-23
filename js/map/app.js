import Basemaps from "./map/basemaps.js"
import Boundaries from "./map/boundaries.js"
import VisualizerModal from "./ui/visualizer-modal.js"
import Markers from "./markers/markers.js"
import ArchiveData from "./data/archive-data.js"
import Legend from "./ui/legend.js"
import TimeSlider from "./ui/time-slider.js"
import SelectionToolbar from "./ui/selection-toolbar.js"
import SelectionResults from "./ui/selection-results.js"
import Searchbar from "./ui/searchbar.js"
import AnalyticsPanel from "./ui/analytics-panel.js"
import CustomSelect from "./ui/custom-select.js"

// ─────────────────────────────────────────────────────────────
// App — bootstraps every module, in dependency order.
// ─────────────────────────────────────────────────────────────

function bootstrap() {
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
	CustomSelect.init(document.querySelector(".custom-select"), {onSelect: () => SelectionResults.refresh()})
}

bootstrap()
