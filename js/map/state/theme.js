import Utils from "../utils.js"

// ─────────────────────────────────────────────────────────────
// Theme — colour lookups, derived once from CSS custom properties.
// ─────────────────────────────────────────────────────────────
const Theme = (() => {
	const roleColors = {
		about: Utils.readCssVar("--color-role-about"),
		using: Utils.readCssVar("--color-role-using"),
		unknown: Utils.readCssVar("--color-role-unknown")
	}

	const categoryColors = {
		bible: Utils.readCssVar("--color-cat-bible"),
		letter: Utils.readCssVar("--color-cat-letter"),
		notes: Utils.readCssVar("--color-cat-notes"),
		poem: Utils.readCssVar("--color-cat-poem"),
		report: Utils.readCssVar("--color-cat-report"),
		roman: Utils.readCssVar("--color-cat-roman"),
		others: Utils.readCssVar("--color-cat-others")
	}

	const authorTypeIds = ["admin", "clergy", "merchant", "military", "poet", "writer", "others"]
	const fallbackColor = "#8b949e"

	function roleColor(roleKey) {
		return roleColors[roleKey] ?? roleColors.unknown
	}

	function categoryColor(category) {
		return categoryColors[category] ?? fallbackColor
	}

	return {categoryColors, authorTypeIds, roleColors, categoryColor, roleColor}
})()

export default Theme
