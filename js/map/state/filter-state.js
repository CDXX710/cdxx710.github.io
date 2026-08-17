import ArchiveData from "../data/archive-data.js"
import Theme from "./theme.js"
import EventBus from "../event-bus.js"

// ─────────────────────────────────────────────────────────────
// FilterState — the active year range / category / author-type /
// creole-role filters. Pure state + predicates; no DOM here.
// ─────────────────────────────────────────────────────────────
const FilterState = (() => {
	const years = ArchiveData.features.map(f => f.properties.time)
	const state = {
		minYear: Math.min(...years),
		maxYear: Math.max(...years),
		showCreoleRole: {using: true, about: true, unknown: true},
		activeCategories: new Set(Object.keys(Theme.categoryColors)),
		activeAuthorTypes: new Set(Theme.authorTypeIds)
	}
	// Tracks which of the four filter groups the user last touched, so
	// classifyHiddenReason (below) can attribute a record hidden by
	// several filters at once to whichever one the user *hasn't* just
	// been adjusting — the filter currently being dragged/clicked is
	// already self-explanatory, so this points the blame elsewhere
	// rather than a fixed guess. Higher = more recently touched. Seeded
	// in this order so the very first hidden record (before any
	// interaction) still resolves deterministically.
	let touchCounter = 0
	const lastTouched = {creoleRole: touchCounter++, timeline: touchCounter++, authorType: touchCounter++, category: touchCounter++}
	function touch(group) {
		lastTouched[group] = ++touchCounter
	}
	function notify() {
		EventBus.emit("filters:changed", state)
	}
	function setYearRange(minYear, maxYear) {
		state.minYear = minYear
		state.maxYear = maxYear
		touch("timeline")
		notify()
	}
	function setCreoleRoleActive(roleKey, isOn) {
		state.showCreoleRole[roleKey] = isOn
		touch("creoleRole")
		notify()
	}
	function setCategoryActive(category, isOn) {
		isOn ? state.activeCategories.add(category) : state.activeCategories.delete(category)
		touch("category")
		notify()
	}
	function setAuthorTypeActive(authorType, isOn) {
		isOn ? state.activeAuthorTypes.add(authorType) : state.activeAuthorTypes.delete(authorType)
		touch("authorType")
		notify()
	}
	function setAllVisible(isOn) {
		state.activeCategories = isOn ? new Set(Object.keys(Theme.categoryColors)) : new Set()
		state.activeAuthorTypes = isOn ? new Set(Theme.authorTypeIds) : new Set()
		state.showCreoleRole = {using: isOn, about: isOn, unknown: isOn}
		// Touches every group equally, preserving their relative order —
		// this is a blanket reset/clear-all, not the user focusing on one
		// particular filter, so it shouldn't reshuffle attribution priority.
		notify()
	}
	function roleKeyFor(creole) {
		return creole === "using" ? "using" : creole === "about" ? "about" : "unknown"
	}
	// "others" is treated like a missing/unknown value for both category
	// and authorType — it always passes its check, the same way a missing
	// (null) authorType always passes. This keeps every "Other / Unknown"
	// record visible no matter which single category or author type is
	// being focused on, and means the real "others" authorType id and the
	// null/missing authorType collapse into one and the same bucket.
	function isOtherOrMissing(authorType) {
		return !authorType || authorType === "others"
	}
	// Single parameterised predicate — isFeatureVisible and
	// isFeatureVisibleIgnoringYear are both this with `ignoreYear`
	// toggled, so they can never drift apart.
	function isFeatureVisibleIgnoring(properties, {ignoreYear = false} = {}) {
		const {time, category, creole, authorType} = properties
		return (ignoreYear || (time >= state.minYear && time <= state.maxYear)) && (category === "others" || state.activeCategories.has(category)) && state.showCreoleRole[roleKeyFor(creole)] && (isOtherOrMissing(authorType) || state.activeAuthorTypes.has(authorType))
	}
	function isFeatureVisible(properties) {
		return isFeatureVisibleIgnoring(properties)
	}
	// Ignores the active year range. Used by the decade timeline itself,
	// which needs to show the full distribution (so users have context
	// for where to drag/click) even while a year filter is already
	// narrowing what's on the map.
	function isFeatureVisibleIgnoringYear(properties) {
		return isFeatureVisibleIgnoring(properties, {ignoreYear: true})
	}
	// Backs the analytics panel's "x records hidden by the ... filter"
	// notices. A record failing more than one filter at once is only
	// ever "hidden by" one of them — attributing it to every filter it
	// happens to fail would double-count it, and attributing it to none
	// (an earlier approach: diff against a scope with only that one
	// filter lifted, which still enforces every other filter) would
	// silently undercount it and leave the four notices not summing to
	// the real hidden total. So this picks exactly one reason per hidden
	// record: among the filters currently failing it, whichever one the
	// user has interacted with *least* recently (see `touch` above) —
	// the filter they're actively adjusting is already the obvious
	// cause, so the notice instead surfaces whichever other blocking
	// filter is easiest to overlook. Ties (nothing touched yet) fall
	// back to the seed order.
	function classifyHiddenReason(properties) {
		const {time, category, creole, authorType} = properties
		const failing = []
		if (!state.showCreoleRole[roleKeyFor(creole)]) failing.push("creoleRole")
		if (time < state.minYear || time > state.maxYear) failing.push("timeline")
		if (!(isOtherOrMissing(authorType) || state.activeAuthorTypes.has(authorType))) failing.push("authorType")
		if (!(category === "others" || state.activeCategories.has(category))) failing.push("category")
		if (!failing.length) return null
		return failing.reduce((leastRecent, group) => (lastTouched[group] < lastTouched[leastRecent] ? group : leastRecent))
	}
	function isCategoryActive(category) {
		return state.activeCategories.has(category)
	}
	function isAuthorTypeActive(authorType) {
		return state.activeAuthorTypes.has(authorType)
	}
	function isCreoleRoleActive(roleKey) {
		return !!state.showCreoleRole[roleKey]
	}
	return {
		get minYear() {
			return state.minYear
		},
		get maxYear() {
			return state.maxYear
		},
		setYearRange,
		setCreoleRoleActive,
		setCategoryActive,
		setAuthorTypeActive,
		setAllVisible,
		isFeatureVisible,
		isFeatureVisibleIgnoringYear,
		classifyHiddenReason,
		isCategoryActive,
		isAuthorTypeActive,
		isCreoleRoleActive,
		roleKeyFor
	}
})()

export default FilterState
