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
		activeAuthorTypes: new Set(Object.keys(Theme.authorTypeColors))
	}
	function notify() {
		EventBus.emit("filters:changed", state)
	}
	function setYearRange(minYear, maxYear) {
		state.minYear = minYear
		state.maxYear = maxYear
		notify()
	}
	function setCreoleRoleActive(roleKey, isOn) {
		state.showCreoleRole[roleKey] = isOn
		notify()
	}
	function setCategoryActive(category, isOn) {
		isOn ? state.activeCategories.add(category) : state.activeCategories.delete(category)
		notify()
	}
	function setAuthorTypeActive(authorType, isOn) {
		isOn ? state.activeAuthorTypes.add(authorType) : state.activeAuthorTypes.delete(authorType)
		notify()
	}
	function setAllVisible(isOn) {
		state.activeCategories = isOn ? new Set(Object.keys(Theme.categoryColors)) : new Set()
		state.activeAuthorTypes = isOn ? new Set(Object.keys(Theme.authorTypeColors)) : new Set()
		state.showCreoleRole = {using: isOn, about: isOn, unknown: isOn}
		notify()
	}
	function roleKeyFor(creole) {
		return creole === "using" ? "using" : creole === "about" ? "about" : "unknown"
	}
	function isFeatureVisible(properties) {
		const {time, category, creole, authorType} = properties
		return time >= state.minYear && time <= state.maxYear && state.activeCategories.has(category) && state.showCreoleRole[roleKeyFor(creole)] && (!authorType || state.activeAuthorTypes.has(authorType))
	}
	// Same as isFeatureVisible but ignores the active year range. Used by
	// the decade timeline itself, which needs to show the full
	// distribution (so users have context for where to drag/click) even
	// while a year filter is already narrowing what's on the map.
	function isFeatureVisibleIgnoringYear(properties) {
		const {category, creole, authorType} = properties
		return state.activeCategories.has(category) && state.showCreoleRole[roleKeyFor(creole)] && (!authorType || state.activeAuthorTypes.has(authorType))
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
		isCategoryActive,
		isAuthorTypeActive,
		isCreoleRoleActive
	}
})()

export default FilterState
