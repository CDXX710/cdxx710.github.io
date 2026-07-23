import SelectionAlgebra from "./selection-algebra.js"
import EventBus from "../event-bus.js"

// ─────────────────────────────────────────────────────────────
// SelectionState — the currently selected feature indices + the active
// combine mode. Pure state; UI reacts to "selection:changed".
// ─────────────────────────────────────────────────────────────
const SelectionState = (() => {
	let selectedIndices = new Set()
	let mode = "new"
	function setMode(nextMode) {
		mode = nextMode
	}
	function getMode() {
		return mode
	}
	function applyHits(hitIndices) {
		selectedIndices = SelectionAlgebra.combine(selectedIndices, hitIndices, mode)
		EventBus.emit("selection:changed", selectedIndices)
	}
	function clear() {
		selectedIndices = new Set()
		EventBus.emit("selection:changed", selectedIndices)
	}
	function has(index) {
		return selectedIndices.has(index)
	}
	function indices() {
		return Array.from(selectedIndices)
	}
	function size() {
		return selectedIndices.size
	}
	return {setMode, getMode, applyHits, clear, has, indices, size}
})()

export default SelectionState
