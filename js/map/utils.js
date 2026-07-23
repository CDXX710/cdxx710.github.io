// ─────────────────────────────────────────────────────────────
// Utils — small generic helpers with no domain knowledge.
// ─────────────────────────────────────────────────────────────
const Utils = (() => {
	function html(strings, ...values) {
		return strings.reduce((out, str, i) => out + str + (i < values.length ? values[i] : ""), "")
	}
	function capitalize(str) {
		return str ? str.charAt(0).toUpperCase() + str.slice(1) : str
	}
	function readCssVar(name) {
		return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
	}
	function el(tag, attrs = {}, children = []) {
		const node = document.createElement(tag)
		for (const [key, value] of Object.entries(attrs)) {
			if (key === "className") node.className = value
			else if (key === "text") node.textContent = value
			else if (key === "html") node.innerHTML = value
			else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2).toLowerCase(), value)
			else node.setAttribute(key, value)
		}
		for (const child of [].concat(children)) {
			if (child) node.appendChild(typeof child === "string" ? document.createTextNode(child) : child)
		}
		return node
	}
	function compareNullsLast(a, b, compareFn) {
		const aNull = a === null || a === undefined
		const bNull = b === null || b === undefined
		if (aNull && bNull) return 0
		if (aNull) return 1
		if (bNull) return -1
		return compareFn(a, b)
	}
	function debounce(fn, waitMs) {
		let timer = null
		return (...args) => {
			clearTimeout(timer)
			timer = setTimeout(() => fn(...args), waitMs)
		}
	}
	return {html, capitalize, readCssVar, el, compareNullsLast, debounce}
})()

export default Utils
