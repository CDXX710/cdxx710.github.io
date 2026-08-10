import EventBus from "../event-bus.js"
import Config from "../config.js"
import ArchiveData from "../data/archive-data.js"
import Theme from "./theme.js"
import FilterState from "./filter-state.js"
import SelectionState from "./selection-state.js"
import Basemaps from "../map/basemaps.js"
import MapCore from "../map/map-core.js"
import TimeSlider from "../ui/time-slider-footer.js"
import {sanitizeState, serializeState, deserializeState} from "./state-sync-schema.js"

// High-frequency events coalesce into a single history entry via
// replaceState; discrete jumps push a fresh entry so Back/Forward
// feels natural. See the integration notes at the bottom of this file
// for why "filters:changed" — a single event in this app — ends up in
// the debounced bucket even though most of its triggers are discrete.
const DEBOUNCE_MS = 300

// ─────────────────────────────────────────────────────────────
// StateSyncManager — listens to the real EventBus, mirrors app state
// into the URL (shareable links), and restores it on load / Back /
// Forward. Falls back to defaults when there are no URL params.
// ─────────────────────────────────────────────────────────────
const StateSyncManager = (() => {
	let bounds = null
	let defaults = null
	let state = null
	let suppressWrites = false
	let debounceTimer = null
	let initialized = false

	function computeBounds() {
		const years = ArchiveData.features.map(f => f.properties.time)
		return {
			maxZoom: Config.map.maxZoom,
			yearExtent: [Math.min(...years), Math.max(...years)],
			baseIds: Config.baseLayers.map(b => b.id),
			overlayIds: Config.overlayLayers.map(o => o.id),
			categoryIds: Object.keys(Theme.categoryColors),
			authorTypeIds: Theme.authorTypeIds,
			creoleRoleIds: ["using", "about", "unknown"],
			sortKeys: ["name", "date", "authorType", "documentType"],
			featureCount: ArchiveData.features.length
		}
	}

	function computeDefaults(b) {
		return {
			center: Config.map.center,
			zoom: Config.map.zoom,
			baseId: Config.defaultBaseLayerId ?? Config.baseLayers[0].id,
			overlayId: Config.defaultOverlayLayerId ?? null,
			yearRange: b.yearExtent,
			activeCategories: b.categoryIds,
			activeAuthorTypes: b.authorTypeIds,
			activeCreoleRoles: b.creoleRoleIds,
			selection: [],
			sort: "name"
		}
	}

	// ── reading current live app state into our shape ──
	function readCurrentAppState() {
		const center = MapCore.map.getCenter()
		return sanitizeState(
			{
				center: [center.lat, center.lng],
				zoom: MapCore.map.getZoom(),
				baseId: state?.baseId ?? defaults.baseId,
				overlayId: state?.overlayId ?? defaults.overlayId,
				yearRange: [FilterState.minYear, FilterState.maxYear],
				activeCategories: bounds.categoryIds.filter(id => FilterState.isCategoryActive(id)),
				activeAuthorTypes: bounds.authorTypeIds.filter(id => FilterState.isAuthorTypeActive(id)),
				activeCreoleRoles: bounds.creoleRoleIds.filter(id => FilterState.isCreoleRoleActive(id)),
				selection: SelectionState.indices(),
				sort: state?.sort ?? defaults.sort
			},
			defaults,
			bounds
		)
	}

	// ── applying a restored state back onto the live app modules ──
	function applyStateToApp(next) {
		suppressWrites = true
		try {
			MapCore.map.setView(next.center, next.zoom, {animate: false})
			Basemaps.setBase(next.baseId)
			if (next.overlayId !== getCurrentOverlayId()) {
				Basemaps.setOverlay(next.overlayId ?? currentOverlayFallbackToggleTarget(next.overlayId))
			}
			FilterState.setYearRange(next.yearRange[0], next.yearRange[1])
			TimeSlider.setRange(next.yearRange[0], next.yearRange[1])
			bounds.categoryIds.forEach(id => FilterState.setCategoryActive(id, next.activeCategories.includes(id)))
			bounds.authorTypeIds.forEach(id => FilterState.setAuthorTypeActive(id, next.activeAuthorTypes.includes(id)))
			bounds.creoleRoleIds.forEach(id => FilterState.setCreoleRoleActive(id, next.activeCreoleRoles.includes(id)))
			SelectionState.setMode("new")
			if (next.selection.length > 0) SelectionState.applyHits(next.selection)
			else SelectionState.clear()
			// Re-sorts the results list correctly, but does NOT move the
			// CustomDropdown's own visual selection — that widget has no
			// programmatic "set value" API (see integration note 8 below).
			EventBus.emit("sort:changed", next.sort)
		} finally {
			suppressWrites = false
		}
		state = next
		EventBus.emit("state:hydrated", getState())
	}

	// Basemaps.setOverlay(id) TOGGLES: calling it with the id that's
	// already active turns it off. There's no direct "set to exactly
	// this id" API, so to force-clear we pass the currently active id
	// back in (toggling it off) rather than a new target id.
	let lastKnownOverlayId = null
	function getCurrentOverlayId() {
		return lastKnownOverlayId
	}
	function currentOverlayFallbackToggleTarget(desired) {
		return desired === null ? lastKnownOverlayId : desired
	}

	// ── history I/O ──
	function writeHistory(mode) {
		const query = serializeState(state, defaults)
		const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
		const historyState = {__appState: state}
		if (mode === "push") window.history.pushState(historyState, "", url)
		else window.history.replaceState(historyState, "", url)
	}

	function scheduleWrite(mode) {
		if (suppressWrites) return
		if (mode === "push") {
			if (debounceTimer) {
				clearTimeout(debounceTimer)
				debounceTimer = null
			}
			writeHistory("push")
			return
		}
		// debounced (replaceState)
		if (debounceTimer) clearTimeout(debounceTimer)
		debounceTimer = setTimeout(() => {
			debounceTimer = null
			writeHistory("replace")
		}, DEBOUNCE_MS)
	}

	// ── inbound EventBus listeners ──
	const unsubscribers = []

	function onViewportChanged(payload) {
		if (suppressWrites) return
		state = sanitizeState({...state, center: payload.center, zoom: payload.zoom}, defaults, bounds)
		scheduleWrite("replace")
	}
	function onFiltersChanged(filterStateSnapshot) {
		if (suppressWrites) return
		state = sanitizeState(
			{
				...state,
				yearRange: [filterStateSnapshot.minYear, filterStateSnapshot.maxYear],
				activeCategories: [...filterStateSnapshot.activeCategories],
				activeAuthorTypes: [...filterStateSnapshot.activeAuthorTypes],
				activeCreoleRoles: bounds.creoleRoleIds.filter(id => filterStateSnapshot.showCreoleRole[id])
			},
			defaults,
			bounds
		)
		// Debounced, not immediate: this single event fires both for
		// discrete checkbox toggles AND for every tick of a year-slider
		// drag (see integration notes). Treating it as debounced avoids
		// flooding history.replaceState during a drag; a checkbox click
		// still lands in the URL ~300ms later, which is imperceptible.
		scheduleWrite("replace")
	}
	function onBaseChanged(layerDef) {
		if (suppressWrites) return
		state = sanitizeState({...state, baseId: layerDef.id}, defaults, bounds)
		scheduleWrite("push")
	}
	function onOverlayChanged(overlayId) {
		lastKnownOverlayId = overlayId
		if (suppressWrites) return
		state = sanitizeState({...state, overlayId}, defaults, bounds)
		scheduleWrite("push")
	}
	function onSelectionChanged(selectedIndices) {
		if (suppressWrites) return
		state = sanitizeState({...state, selection: Array.from(selectedIndices)}, defaults, bounds)
		scheduleWrite("push")
	}
	function onSortChanged(sortKey) {
		if (suppressWrites) return
		state = sanitizeState({...state, sort: sortKey}, defaults, bounds)
		scheduleWrite("push")
	}

	function onPopstate(event) {
		const restored = event.state && event.state.__appState ? event.state.__appState : deserializeState(window.location.search)
		applyStateToApp(sanitizeState(restored, defaults, bounds))
	}

	function hydrateFromCurrentLocation() {
		const search = window.location.search
		// Priority 1: explicit URL params. Priority 2: defaults, if there
		// are no URL params to restore from.
		const source = search && search.length > 1 ? sanitizeState(deserializeState(search), defaults, bounds) : {...defaults}
		applyStateToApp(source)
		writeHistory("replace")
	}

	function getState() {
		return state ? {...state} : null
	}

	function getShareableUrl(customState) {
		const target = customState ? sanitizeState(customState, defaults, bounds) : state
		const query = serializeState(target, defaults)
		const url = new URL(window.location.href)
		url.search = query
		return url.toString()
	}

	function initialize() {
		if (initialized) return
		initialized = true

		bounds = computeBounds()
		defaults = computeDefaults(bounds)
		state = {...defaults}
		lastKnownOverlayId = Config.defaultOverlayLayerId ?? null

		window.addEventListener("popstate", onPopstate)
		unsubscribers.push(EventBus.on("viewport:changed", onViewportChanged))
		unsubscribers.push(EventBus.on("filters:changed", onFiltersChanged))
		unsubscribers.push(EventBus.on("basemap:baseChanged", onBaseChanged))
		unsubscribers.push(EventBus.on("basemap:overlayChanged", onOverlayChanged))
		unsubscribers.push(EventBus.on("selection:changed", onSelectionChanged))
		unsubscribers.push(EventBus.on("sort:changed", onSortChanged))

		hydrateFromCurrentLocation()
	}

	function destroy() {
		window.removeEventListener("popstate", onPopstate)
		unsubscribers.forEach(off => off())
		unsubscribers.length = 0
		if (debounceTimer) {
			clearTimeout(debounceTimer)
			debounceTimer = null
		}
		initialized = false
	}

	return {initialize, destroy, getState, getShareableUrl}
})()

export default StateSyncManager

// ─────────────────────────────────────────────────────────────
// INTEGRATION NOTES — read before trusting this at face value
// ─────────────────────────────────────────────────────────────
// This app's real state shape does not match a generic "one basemap
// enum / one selected entity / one filter list" model. Specifically:
//
// 1. Filters are three independent dimensions (categories, author
//    types, creole role) plus a year range — not a flat activeFilters
//    array. The URL schema reflects that (`cat`, `auth`, `cr`, `y`).
//
// 2. Selection is a Set of feature indices (multi-select via draw
//    tools), not a single selectedEntityId. Indices are positions in
//    ArchiveData.features, which has no stable id field — they're only
//    valid as long as the dataset itself doesn't change shape. If
//    ArchiveData ever becomes dynamic (loaded/paginated/re-ordered),
//    this needs a real id field before it's safe to persist.
//
// 3. "Basemap" is really two independent layers — a base (radio,
//    always exactly one) and an optional historical overlay — not one
//    enum. `Basemaps.setOverlay(id)` also *toggles*, so restoring "no
//    overlay" means re-toggling the current one off, not setting a
//    third value.
//
// 4. There's no panel-visibility bitmask anywhere in this app (no
//    concept of togglable panels with open/closed state), so that part
//    of a generic spec has no home here and was dropped rather than
//    invented.
//
// 5. `filters:changed` is the single event both a checkbox click AND
//    every tick of a year-slider drag fire through — there's no
//    separate low-frequency "committed" event. It's treated as
//    debounced across the board (see onFiltersChanged above), which
//    trades a few hundred ms of URL staleness after a checkbox click
//    for not flooding history.replaceState during a slider drag.
//
// 6b. localStorage persistence was intentionally dropped: state now
//    comes only from URL params, falling back to defaults when none
//    are present. There is no "returning visitor" preference layer.
//
// 6. Viewport sync required new plumbing: nothing previously put pan/
//    zoom on the EventBus. `MapCore` now emits `viewport:changed` on
//    Leaflet's `moveend` (see map-core.js) — this is a new event this
//    integration introduces, not one that already existed.
//
// 7. Selections above 200 indices are dropped from the shareable URL
//    (still fully functional in the live session) to avoid an
//    unusably long / copy-paste-truncated link. There is currently no
//    warning shown to the user when this happens.
//
// 8. Restoring `sort` re-orders the results list (via the same
//    "sort:changed" event CustomDropdown emits) but does not move the
//    dropdown's own visual selection, since CustomDropdown only
//    exposes an onSelect callback, not a setValue method. A URL with
//    ?sort=date will show date-sorted results under a dropdown still
//    labeled "Name" until the user opens it. Fixing this cleanly means
//    adding a small setValue/selectOption method to CustomDropdown.
// ─────────────────────────────────────────────────────────────
