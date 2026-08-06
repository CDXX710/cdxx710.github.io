// ─────────────────────────────────────────────────────────────
// StateSyncSchema — pure functions only. No DOM, no history, no
// localStorage, no EventBus. Given the same input you always get the
// same output, so this is unit-testable in isolation.
//
// Unlike a generic "MapState", this is shaped around what THIS app
// actually has: multi-value category/author-type/creole-role filters
// (not a flat activeFilters list), a multi-index feature selection
// (not a single selectedEntityId), and a base+overlay layer pair
// (not one basemapId enum). See the integration notes at the bottom
// of state-sync-manager.js for why.
// ─────────────────────────────────────────────────────────────

const URL_KEYS = Object.freeze({
	center: "c",
	zoom: "z",
	baseId: "b",
	overlayId: "o",
	yearRange: "y",
	categories: "cat",
	authorTypes: "auth",
	creoleRoles: "cr",
	selection: "sel",
	sort: "sort"
})

// Selections beyond this size are still fully functional in-app but are
// dropped from the shareable URL — a hand-drawn polygon can easily
// select hundreds of records, and stuffing hundreds of indices into a
// query string produces an unusable, easily-truncated-by-copy-paste URL.
const MAX_SELECTION_IN_URL = 200

function isFiniteNumber(value) {
	return typeof value === "number" && Number.isFinite(value)
}
function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value))
}
function roundTo(value, decimals) {
	const factor = 10 ** decimals
	return Math.round(value * factor) / factor
}
function sameStringSet(a, b) {
	if (a.length !== b.length) return false
	const setB = new Set(b)
	return a.every(v => setB.has(v))
}

/**
 * @typedef {Object} StateBounds - dynamic validity ranges pulled from
 *   the live app (Config, Theme, ArchiveData, FilterState) at call time.
 * @property {number} maxZoom
 * @property {[number, number]} yearExtent - [datasetMinYear, datasetMaxYear]
 * @property {string[]} baseIds
 * @property {string[]} overlayIds
 * @property {string[]} categoryIds
 * @property {string[]} authorTypeIds
 * @property {string[]} creoleRoleIds
 * @property {string[]} sortKeys
 * @property {number} featureCount
 */

/**
 * Sanitizes an arbitrary/partial object into a fully valid app state,
 * filling in `fallback` for anything missing or invalid. Never throws.
 */
export function sanitizeState(partial = {}, fallback, bounds) {
	return {
		center: sanitizeCenter(partial.center, fallback.center),
		zoom: sanitizeZoom(partial.zoom, fallback.zoom, bounds.maxZoom),
		baseId: bounds.baseIds.includes(partial.baseId) ? partial.baseId : fallback.baseId,
		overlayId: partial.overlayId === null ? null : bounds.overlayIds.includes(partial.overlayId) ? partial.overlayId : fallback.overlayId,
		yearRange: sanitizeYearRange(partial.yearRange, fallback.yearRange, bounds.yearExtent),
		activeCategories: sanitizeStringSubset(partial.activeCategories, fallback.activeCategories, bounds.categoryIds),
		activeAuthorTypes: sanitizeStringSubset(partial.activeAuthorTypes, fallback.activeAuthorTypes, bounds.authorTypeIds),
		activeCreoleRoles: sanitizeStringSubset(partial.activeCreoleRoles, fallback.activeCreoleRoles, bounds.creoleRoleIds),
		selection: sanitizeSelection(partial.selection, fallback.selection, bounds.featureCount),
		sort: bounds.sortKeys.includes(partial.sort) ? partial.sort : fallback.sort
	}
}

function sanitizeCenter(rawCenter, fallback) {
	if (!Array.isArray(rawCenter) || rawCenter.length !== 2) return fallback
	const [lat, lng] = rawCenter.map(Number)
	if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return fallback
	if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return fallback
	return [roundTo(lat, 4), roundTo(lng, 4)]
}

function sanitizeZoom(rawZoom, fallback, maxZoom) {
	const zoom = Number(rawZoom)
	if (!isFiniteNumber(zoom)) return fallback
	return roundTo(clamp(zoom, 0, maxZoom), 2)
}

function sanitizeYearRange(rawRange, fallback, [extentMin, extentMax]) {
	if (!Array.isArray(rawRange) || rawRange.length !== 2) return fallback
	const [start, end] = rawRange.map(Number)
	if (!isFiniteNumber(start) || !isFiniteNumber(end)) return fallback
	if (start > end) return fallback
	return [clamp(Math.trunc(start), extentMin, extentMax), clamp(Math.trunc(end), extentMin, extentMax)]
}

function sanitizeStringSubset(rawList, fallback, knownIds) {
	if (!Array.isArray(rawList)) return fallback
	const known = new Set(knownIds)
	const cleaned = [...new Set(rawList.filter(id => typeof id === "string" && known.has(id)))]
	return cleaned
}

function sanitizeSelection(rawList, fallback, featureCount) {
	if (!Array.isArray(rawList)) return fallback
	const cleaned = rawList.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < featureCount)
	return [...new Set(cleaned)]
}

/**
 * Serializes app state into a query string (no leading "?"), omitting
 * fields that equal `defaults` so a clean/default URL stays clean.
 */
export function serializeState(state, defaults) {
	const params = new URLSearchParams()

	const [lat, lng] = state.center
	if (lat !== defaults.center[0] || lng !== defaults.center[1]) {
		params.set(URL_KEYS.center, `${roundTo(lat, 4)},${roundTo(lng, 4)}`)
	}
	if (state.zoom !== defaults.zoom) params.set(URL_KEYS.zoom, roundTo(state.zoom, 2).toString())
	if (state.baseId !== defaults.baseId) params.set(URL_KEYS.baseId, state.baseId)
	if (state.overlayId !== defaults.overlayId && state.overlayId) params.set(URL_KEYS.overlayId, state.overlayId)

	const [ys, ye] = state.yearRange
	if (ys !== defaults.yearRange[0] || ye !== defaults.yearRange[1]) params.set(URL_KEYS.yearRange, `${ys},${ye}`)

	if (!sameStringSet(state.activeCategories, defaults.activeCategories)) params.set(URL_KEYS.categories, state.activeCategories.join(","))
	if (!sameStringSet(state.activeAuthorTypes, defaults.activeAuthorTypes)) params.set(URL_KEYS.authorTypes, state.activeAuthorTypes.join(","))
	if (!sameStringSet(state.activeCreoleRoles, defaults.activeCreoleRoles)) params.set(URL_KEYS.creoleRoles, state.activeCreoleRoles.join(","))

	if (state.selection.length > 0 && state.selection.length <= MAX_SELECTION_IN_URL) {
		params.set(URL_KEYS.selection, state.selection.join(","))
	}
	if (state.sort !== defaults.sort) params.set(URL_KEYS.sort, state.sort)

	return params.toString()
}

/**
 * Parses raw URL search params into a *partial*, unsanitized state
 * object. Pass the result through sanitizeState before trusting it.
 */
export function deserializeState(search) {
	const params = search instanceof URLSearchParams ? search : new URLSearchParams(search || "")
	const partial = {}

	if (params.has(URL_KEYS.center)) {
		const parts = params.get(URL_KEYS.center).split(",")
		if (parts.length === 2) partial.center = [Number(parts[0]), Number(parts[1])]
	}
	if (params.has(URL_KEYS.zoom)) partial.zoom = Number(params.get(URL_KEYS.zoom))
	if (params.has(URL_KEYS.baseId)) partial.baseId = params.get(URL_KEYS.baseId)
	if (params.has(URL_KEYS.overlayId)) partial.overlayId = params.get(URL_KEYS.overlayId)
	if (params.has(URL_KEYS.yearRange)) {
		const parts = params.get(URL_KEYS.yearRange).split(",")
		if (parts.length === 2) partial.yearRange = [Number(parts[0]), Number(parts[1])]
	}
	if (params.has(URL_KEYS.categories)) partial.activeCategories = splitOrEmpty(params.get(URL_KEYS.categories))
	if (params.has(URL_KEYS.authorTypes)) partial.activeAuthorTypes = splitOrEmpty(params.get(URL_KEYS.authorTypes))
	if (params.has(URL_KEYS.creoleRoles)) partial.activeCreoleRoles = splitOrEmpty(params.get(URL_KEYS.creoleRoles))
	if (params.has(URL_KEYS.selection)) partial.selection = splitOrEmpty(params.get(URL_KEYS.selection)).map(Number)
	if (params.has(URL_KEYS.sort)) partial.sort = params.get(URL_KEYS.sort)

	return partial
}

function splitOrEmpty(raw) {
	return raw === "" ? [] : raw.split(",")
}

export {URL_KEYS, MAX_SELECTION_IN_URL}
