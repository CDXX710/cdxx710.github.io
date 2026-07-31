import Utils from "../utils.js"
import ArchiveData from "../data/archive-data.js"
import SelectionState from "../state/selection-state.js"
import ViewportQuery from "./viewport-query.js"

// ─────────────────────────────────────────────────────────────
// ResultsViewState — owns the "which records are relevant right
// now" question: whether we're showing everything in the current
// map bounds vs. just the active selection, plus sorting and the
// select-all action. Kept separate from rendering/DOM concerns.
// ─────────────────────────────────────────────────────────────

const sorters = {
	date: (a, b) => Utils.compareNullsLast(a.properties.time, b.properties.time, (x, y) => x - y),
	documentType: (a, b) => Utils.compareNullsLast(a.properties.category, b.properties.category, (x, y) => x.localeCompare(y)),
	authorType: (a, b) => Utils.compareNullsLast(a.properties.authorType, b.properties.authorType, (x, y) => x.localeCompare(y)),
	name: (a, b) => Utils.compareNullsLast(a.properties.name, b.properties.name, (x, y) => x.localeCompare(y))
}

const ResultsViewState = (() => {
	let showAllInBbox = true
	let recordsInView = 0

	function isShowingAllInBbox() {
		return showAllInBbox
	}
	function setShowAllInBbox(value) {
		showAllInBbox = value
	}
	function toggleShowAllInBbox() {
		showAllInBbox = !showAllInBbox
		return showAllInBbox
	}
	function recordsInViewCount() {
		return recordsInView
	}
	function setRecordsInView(count) {
		recordsInView = count
	}

	function visibleIndices() {
		return ViewportQuery.featuresInView({respectFilters: "active"})
	}
	function activeIndices() {
		return showAllInBbox ? visibleIndices() : SelectionState.indices()
	}
	function sortedIndices(sortKey) {
		const indices = activeIndices()
		const comparator = sorters[sortKey]
		if (!comparator) return indices.sort((a, b) => a - b)
		return indices.sort((a, b) => comparator(ArchiveData.features[a], ArchiveData.features[b]))
	}

	function selectAll() {
		// applyHits() combines using the currently active tool mode (add/subtract/
		// intersect/…), but "select all" should always replace the selection
		// outright — so we force "new" mode for this one call, then restore
		// whatever mode was active before.
		const previousMode = SelectionState.getMode()
		const allIndices = ArchiveData.features.map((_, index) => index)
		SelectionState.setMode("new")
		SelectionState.applyHits(allIndices)
		SelectionState.setMode(previousMode)
	}

	return {
		isShowingAllInBbox,
		setShowAllInBbox,
		toggleShowAllInBbox,
		recordsInViewCount,
		setRecordsInView,
		activeIndices,
		sortedIndices,
		selectAll
	}
})()

export default ResultsViewState
