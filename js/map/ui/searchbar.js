import Utils from "../utils.js"
import Config from "../config.js"
import ArchiveData from "../data/archive-data.js"
import SelectionState from "../state/selection-state.js"
import Panels from "./panels.js"

// ─────────────────────────────────────────────────────────────
// Searchbar — the search input: matching, debouncing, and the
// open/close animation state machine for the collapsed search icon.
// ─────────────────────────────────────────────────────────────
const Searchbar = (() => {
	function matchesQuery(feature, query) {
		const {name, time, category, creole, authorType} = feature.properties
		const haystack = [name, time, category, creole, authorType].filter(Boolean).join(" ").toLowerCase()
		const escaped = query.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
		const regex = new RegExp(`\\b${escaped}`, "i")
		return regex.test(haystack)
	}
	function runSearch(rawQuery) {
		const query = rawQuery.trim().toLowerCase()
		if (!query) {
			SelectionState.clear()
			return
		}
		const matchingIndices = ArchiveData.features.map((feature, index) => (matchesQuery(feature, query) ? index : -1)).filter(index => index !== -1)
		const previousMode = SelectionState.getMode()
		SelectionState.setMode("new")
		SelectionState.applyHits(matchingIndices)
		SelectionState.setMode(previousMode)
	}
	function init() {
		const bar = document.getElementById("map-searchbar")
		const trigger = document.getElementById("trigger")
		const fieldBox = document.getElementById("field-box")
		const input = document.getElementById("field")
		const clearBtn = document.getElementById("searchClearBtn")
		Panels.isolateFromMap(bar)
		let open = false,
			animating = false,
			pendingOpen = null
		const searchDebounced = Utils.debounce(runSearch, Config.search.debounceMs)
		function setOpen(next) {
			if (next === open) {
				pendingOpen = null
				return
			}
			if (animating) {
				pendingOpen = next
				return
			}
			animating = true
			open = next
			bar.classList.toggle("is-open", open)
			trigger.setAttribute("aria-expanded", String(open))
			if (open) {
				setTimeout(() => input.focus())
			} else {
				input.blur()
				input.value = ""
				clearBtn.classList.remove("is-visible")
				runSearch("")
			}
			setTimeout(() => {
				animating = false
				if (pendingOpen !== null && pendingOpen !== open) {
					const queued = pendingOpen
					pendingOpen = null
					setOpen(queued)
				} else {
					pendingOpen = null
				}
			}, Config.searchbarAnimationMs)
		}
		trigger.addEventListener("click", () => setOpen(!open))
		bar.addEventListener("mousedown", e => {
			if ((e.target === bar || e.target === fieldBox) && SelectionState.size() === 0) setOpen(false)
		})
		input.addEventListener("input", () => {
			clearBtn.classList.toggle("is-visible", input.value.length > 0)
			searchDebounced(input.value)
		})
		clearBtn.addEventListener("click", () => {
			input.value = ""
			clearBtn.classList.remove("is-visible")
			input.focus()
			runSearch("")
		})
		input.addEventListener("blur", () => {
			setTimeout(() => {
				if (open && !bar.contains(document.activeElement) && SelectionState.size() === 0) setOpen(false)
			}, 0)
		})
		document.addEventListener("keydown", e => {
			if (e.key === "Escape" && open) setOpen(false)
		})
	}
	return {init}
})()

export default Searchbar
