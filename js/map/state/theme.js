import Utils from "../utils.js"

// ─────────────────────────────────────────────────────────────
// Theme — colour lookups, derived once from CSS custom properties.
// ─────────────────────────────────────────────────────────────
const Theme = (() => {
	const categoryColors = {
		bible: Utils.readCssVar("--color-cat-bible"),
		letter: Utils.readCssVar("--color-cat-letter"),
		notes: Utils.readCssVar("--color-cat-notes"),
		poem: Utils.readCssVar("--color-cat-poem"),
		report: Utils.readCssVar("--color-cat-report"),
		roman: Utils.readCssVar("--color-cat-roman"),
		others: Utils.readCssVar("--color-cat-others")
	}
	const authorTypeColors = {
		admin: Utils.readCssVar("--color-writ-admin"),
		clergy: Utils.readCssVar("--color-writ-clergy"),
		merchant: Utils.readCssVar("--color-writ-merchant"),
		military: Utils.readCssVar("--color-writ-military"),
		poet: Utils.readCssVar("--color-writ-poet"),
		writer: Utils.readCssVar("--color-writ-writer"),
		others: Utils.readCssVar("--color-writ-others")
	}
	const fallbackColor = "#8b949e"
	function categoryColor(category) {
		return categoryColors[category] ?? fallbackColor
	}
	function creoleColor(authorType) {
		return authorType ? authorTypeColors[authorType] : null
	}
	return {categoryColors, authorTypeColors, categoryColor, creoleColor}
})()

export default Theme
