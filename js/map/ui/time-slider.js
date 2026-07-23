import FilterState from "../state/filter-state.js"

// ─────────────────────────────────────────────────────────────
// TimeSlider — the footer year-range slider (noUiSlider), the one
// piece of UI allowed to write straight to FilterState's year range.
// ─────────────────────────────────────────────────────────────
const TimeSlider = (() => {
	let sliderEl
	function init() {
		sliderEl = document.getElementById("time-slider")
		const rangeValueEl = document.getElementById("range-value")
		noUiSlider.create(sliderEl, {
			start: [FilterState.minYear, FilterState.maxYear],
			connect: true,
			step: 1,
			range: {min: FilterState.minYear, max: FilterState.maxYear}
		})
		sliderEl.noUiSlider.on("update", values => {
			const [min, max] = values.map(Math.round)
			rangeValueEl.textContent = `${min} – ${max}`
			FilterState.setYearRange(min, max)
		})
	}
	// Drives the slider programmatically (e.g. from the analytics timeline);
	// the slider's own "update" handler takes care of notifying FilterState.
	function setRange(min, max) {
		sliderEl?.noUiSlider.set([min, max])
	}
	return {init, setRange}
})()

export default TimeSlider
