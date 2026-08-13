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

	// NOTE: these CSS custom properties (--color-writ-*) don't exist
	// in the stylesheet yet — add them alongside --color-cat-* so each
	// author type gets a distinct colour instead of falling back to
	// fallbackColor for all of them.
	const authorTypeColors = {
		admin: Utils.readCssVar("--color-writ-admin"),
		clergy: Utils.readCssVar("--color-writ-clergy"),
		merchant: Utils.readCssVar("--color-writ-merchant"),
		military: Utils.readCssVar("--color-writ-military"),
		poet: Utils.readCssVar("--color-writ-poet"),
		writer: Utils.readCssVar("--color-writ-writer"),
		others: Utils.readCssVar("--color-writ-others")
	}

	function roleColor(roleKey) {
		return roleColors[roleKey] ?? roleColors.unknown
	}

	function categoryColor(category) {
		return categoryColors[category] ?? fallbackColor
	}

	function authorTypeColor(authorType) {
		return authorTypeColors[authorType] || fallbackColor
	}

	return {categoryColors, authorTypeIds, authorTypeColors, roleColors, categoryColor, roleColor, authorTypeColor}
})()

export default Theme
