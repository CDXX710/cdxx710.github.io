import ArchiveData from "../data/archive-data.js"
import MapCore from "../map/map-core.js"
import FilterState from "./filter-state.js"

// ─────────────────────────────────────────────────────────────
// ViewportQuery — the single "which features are in the current map
// viewport" scan, used by ResultsViewState, AnalyticsPanel's
// records-in-view, and AnalyticsPanel's timeline. Previously each of
// these re-scanned the full feature set independently; this replaces
// all three with one parameterised implementation.
//
// `respectFilters` controls which (if any) FilterState predicate is
// applied before the bounds check:
//   - "none"       — every feature in bounds, filters ignored.
//                    Not currently used by any call site (kept for
//                    completeness/future use) since ResultsViewState's
//                    "visible in bbox" mode was aligned with
//                    AnalyticsPanel's records-in-view to both respect
//                    active filters, avoiding a "visible" list that
//                    disagreed with what's actually shown on the map.
//   - "active"     — only features currently passing all active
//                    filters, same predicate that drives marker
//                    visibility (ResultsViewState's visibleIndices,
//                    AnalyticsPanel's records-in-view).
//   - "ignoreYear" — respects every filter except the year range, so
//                    the decade timeline keeps its out-of-range
//                    context (AnalyticsPanel's timeline scope).
// ─────────────────────────────────────────────────────────────
const ViewportQuery = (() => {
	const predicates = {
		none: null,
		active: properties => FilterState.isFeatureVisible(properties),
		ignoreYear: properties => FilterState.isFeatureVisibleIgnoringYear(properties)
	}

	function featuresInView({respectFilters = "none"} = {}) {
		const predicate = predicates[respectFilters] ?? null
		const bounds = MapCore.map.getBounds()
		const indices = []
		ArchiveData.features.forEach((feature, index) => {
			if (predicate && !predicate(feature.properties)) return
			const [lng, lat] = feature.geometry.coordinates
			if (bounds.contains([lat, lng])) indices.push(index)
		})
		return indices
	}

	// Tally of in-viewport records hidden by each filter, for
	// AnalyticsPanel's "x records hidden by the ... filter" notices.
	// Each hidden record is attributed to exactly one filter (see
	// FilterState.classifyHiddenReason's priority order), so these four
	// counts always sum to (records in bounds) - (records in view).
	function hiddenCounts() {
		const bounds = MapCore.map.getBounds()
		const counts = {creoleRole: 0, timeline: 0, authorType: 0, category: 0}
		ArchiveData.features.forEach(feature => {
			const [lng, lat] = feature.geometry.coordinates
			if (!bounds.contains([lat, lng])) return
			const reason = FilterState.classifyHiddenReason(feature.properties)
			if (reason) counts[reason] += 1
		})
		return counts
	}

	return {featuresInView, hiddenCounts}
})()

export default ViewportQuery
