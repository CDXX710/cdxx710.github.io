// ─────────────────────────────────────────────────────────────
// CustomSelect — generic custom <select>-like dropdown behaviour,
// with no knowledge of what it's used for (currently: sort-by).
// ─────────────────────────────────────────────────────────────
const CustomSelect = (() => {
	function init(rootEl, {onSelect} = {}) {
		const trigger = rootEl.querySelector(".custom-select__trigger")
		const valueEl = rootEl.querySelector(".custom-select__value")
		const hiddenInput = rootEl.querySelector("input")
		const options = rootEl.querySelectorAll(".custom-select__option")
		function close() {
			rootEl.classList.remove("open")
			trigger.setAttribute("aria-expanded", "false")
		}
		trigger.addEventListener("click", () => {
			const open = rootEl.classList.toggle("open")
			trigger.setAttribute("aria-expanded", String(open))
		})
		options.forEach(option => {
			option.addEventListener("click", () => {
				options.forEach(o => o.classList.remove("is-selected"))
				option.classList.add("is-selected")
				valueEl.textContent = option.textContent
				hiddenInput.value = option.dataset.value
				close()
				onSelect?.(option.dataset.value)
			})
		})
		document.addEventListener("click", evt => {
			if (!rootEl.contains(evt.target)) close()
		})
	}
	return {init}
})()

export default CustomSelect
