// ─────────────────────────────────────────────────────────────
// CustomDropdown — generic custom <select>-like dropdown behaviour,
// with no knowledge of what it's used for (currently: sort-by).
//
// Hooks are data-attributes rather than a fixed ".custom-dropdown__*"
// class name, so this can be reused under any wrapper class
// (".custom-dropdown", ".results-panel__actions-dropdown", etc.)
// without silently no-oping when the wrapper's BEM block changes.
// ─────────────────────────────────────────────────────────────
const CustomDropdown = (() => {
	function init(rootEl, {onSelect} = {}) {
		const trigger = rootEl.querySelector("[data-dropdown-trigger]")
		const valueEl = rootEl.querySelector("[data-dropdown-value]")
		const hiddenInput = rootEl.querySelector("input")
		const options = rootEl.querySelectorAll("[data-dropdown-option]")
		if (!trigger || !valueEl || !hiddenInput || options.length === 0) {
			console.warn("CustomDropdown.init: missing expected [data-dropdown-*] hooks on", rootEl)
			return
		}
		function close() {
			rootEl.classList.remove("open")
			trigger.setAttribute("aria-expanded", "false")
		}
		// Moves the visual selection to `value` WITHOUT firing onSelect —
		// for programmatic restoration (e.g. from a shared/restored URL),
		// where the state is already applied and re-notifying would loop.
		function selectValue(value) {
			const match = Array.from(options).find(o => o.dataset.value === value)
			if (!match) return
			options.forEach(o => {
				o.classList.remove("is-selected")
				o.setAttribute("aria-selected", "false")
			})
			match.classList.add("is-selected")
			match.setAttribute("aria-selected", "true")
			valueEl.textContent = match.textContent
			hiddenInput.value = value
		}
		trigger.addEventListener("click", () => {
			const open = rootEl.classList.toggle("open")
			trigger.setAttribute("aria-expanded", String(open))
		})
		options.forEach(option => {
			option.addEventListener("click", () => {
				selectValue(option.dataset.value)
				close()
				onSelect?.(option.dataset.value)
			})
		})
		document.addEventListener("click", evt => {
			if (!rootEl.contains(evt.target)) close()
		})
		return {selectValue}
	}
	return {init}
})()

export default CustomDropdown
