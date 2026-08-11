import Utils from "../utils.js"

// ─────────────────────────────────────────────────────────────
// Shapes — SVG generation for marker icons and legend swatches.
//
// Every marker always renders as its actual creoleRole icon (the
// about/using/unknown speech-bubble glyphs) — there's no separate
// "plain dot" shape any more. Only the fill colour changes (see
// markers.js#buildIcon):
//   - role's own brand colour, when more than one creoleRole is
//     present (Theme.roleColor) — role is the useful thing to
//     highlight.
//   - the record's category colour, once filtering has left only a
//     single creoleRole on the map (Theme.categoryColor) — role is no
//     longer distinguishing anything, so category becomes the more
//     useful colour, while the icon itself stays put.
// authorType no longer drives any marker colour or ring — dropped
// entirely along with the old shapes.
// ─────────────────────────────────────────────────────────────
const Shapes = (() => {
	// Role icon geometry — traced from the about.svg/using.svg/
	// unknown.svg assets (1000×1000 viewBox). Colour comes in via
	// `fill`; the speech-bubble itself always stays white. Colour-
	// bearing elements also carry `shape-fill` so the legend can drive
	// them off `--shape-color` (and dim them when a row is toggled
	// off) purely through CSS — see legend-panel.css. That class has
	// no effect on the map (no matching selector there), so the same
	// markup serves both marker and legend rendering.
	const roleIconFragments = {
		about: fill => Utils.html`
			<circle class="shape-fill" cx="500" cy="500" r="500" fill="${fill}" />
			<path fill="#fff" d="M233.33,350c0-36.83,29.83-66.67,66.67-66.67h400c36.83,0,66.67,29.83,66.67,66.67v200c0,36.83-29.83,66.67-66.67,66.67h-233.33l-133.33,100v-100h-33.33c-36.83,0-66.67-29.83-66.67-66.67v-200Z" />
			<circle class="shape-fill" fill="${fill}" cx="500" cy="345" r="32" />
			<path class="shape-fill" fill="none" stroke="${fill}" stroke-linecap="round" stroke-width="48" d="M500,412v128" />
		`,
		using: fill => Utils.html`
			<circle class="shape-fill" cx="500" cy="500" r="500" fill="${fill}" />
			<path fill="#fff" d="M233,350.46c0-36.72,29.87-66.46,66.75-66.46h400.5c36.88,0,66.75,29.74,66.75,66.46v199.38c0,36.72-29.87,66.46-66.75,66.46h-233.62l-133.5,99.69v-99.69h-33.37c-36.88,0-66.75-29.74-66.75-66.46v-199.38Z" />
			<path class="shape-fill" stroke="${fill}" stroke-linecap="round" stroke-width="48" d="M360,400h280M360,500h140" />
		`,
		unknown: fill => Utils.html`
			<circle class="shape-fill" cx="500" cy="500" r="500" fill="${fill}" />
			<path fill="#fff" d="M233.33,350c0-36.83,29.83-66.67,66.67-66.67h400c36.83,0,66.67,29.83,66.67,66.67v200c0,36.83-29.83,66.67-66.67,66.67h-233.33l-133.33,100v-100h-33.33c-36.83,0-66.67-29.83-66.67-66.67v-200Z" />
			<circle class="shape-fill" fill="${fill}" cx="500" cy="540" r="24" />
			<path class="shape-fill" fill="none" stroke="${fill}" stroke-linecap="round" stroke-width="48" d="M450,387.17c0-27.67,22.33-50,50-50s50,22.33,50,50-23.33,43.33-40,56.67c-6.67,5-10,13.33-10,21.67v13.33" />
		`
	}

	// Generic abstract swatches — used by the Layers group only
	// (islands/waters/flags in boundaries.js), which predates and is
	// unrelated to creoleRole/authorType/category. Author-type rows use
	// the plain "unknown" dot; creoleRole rows use the real icon via
	// roleLegendSvg below instead of any of these.
	const legendFragments = {
		square: `<rect class="shape-fill" x="1.5" y="1.5" width="11" height="11" stroke-width="1.5" rx="1" />`,
		triangle: `<polygon class="shape-fill" points="7,1 13,13 1,13" stroke-width="1.5" stroke-linejoin="round" />`,
		circle: `<circle class="shape-fill" cx="7" cy="7" r="5" stroke-width="1.5" />`,
		ring: `<circle class="shape-fill shape-fill--ring" cx="7" cy="7" r="5" stroke-width="3" />`
	}

	// Document-type (category) swatches — one entry per Theme.categoryColors
	// key. These are placeholders: each fragment is a standalone 14x14
	// (viewBox 0 0 14 14) SVG snippet, swap it out per category once real
	// curated icons are ready. Keep the `shape-fill` class on whichever
	// element should carry `--shape-color` so the legend's colouring and
	// is-off dimming (see legend-panel.css) keep working without any other
	// changes; if a replacement icon is stroke-only (no fill), also add
	// `shape-fill--ring` the way the Layers "waters" ring icon does.
	const categoryFragments = {
		bible: `<rect class="shape-fill" x="1.5" y="1.5" width="11" height="11" stroke-width="1.5" rx="1" />`,
		letter: `<polygon class="shape-fill" points="7,1 13,13 1,13" stroke-width="1.5" stroke-linejoin="round" />`,
		notes: `<circle class="shape-fill" cx="7" cy="7" r="5" stroke-width="1.5" />`,
		poem: `<polygon class="shape-fill" points="7,1 13,7 7,13 1,7" stroke-width="1.5" stroke-linejoin="round" />`,
		report: `<rect class="shape-fill" x="1.5" y="1.5" width="11" height="11" stroke-width="1.5" rx="1" />`,
		roman: `<circle class="shape-fill" cx="7" cy="7" r="5" stroke-width="1.5" />`,
		others: `<circle class="shape-fill" cx="7" cy="7" r="5" stroke-width="1.5" />`
	}

	function roleSvg(roleKey, fillColor, pxSize) {
		const inner = (roleIconFragments[roleKey] ?? roleIconFragments.unknown)(fillColor)
		return Utils.html`<svg xmlns="http://www.w3.org/2000/svg" width="${pxSize}" height="${pxSize}" viewBox="0 0 1000 1000" style="overflow:visible;" aria-hidden="true">${inner}</svg>`
	}

	// Map marker: role icon, sized up, with a soft glow in the same
	// colour as the fill (no longer tied to authorType).
	function markerSvg(roleKey, fillColor) {
		const inner = (roleIconFragments[roleKey] ?? roleIconFragments.unknown)(fillColor)
		const glow = `filter:drop-shadow(0 0 0.25rem ${fillColor})`
		return Utils.html`<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 1000 1000" style="overflow:visible; ${glow};">${inner}</svg>`
	}

	// Legend row for the creoleRole group: the real icon at swatch
	// size. `fillColor` seeds the row's `--shape-color` (set by the
	// caller); the shape-fill class means CSS actually drives the
	// colour (and the is-off dimming), same as the plain dots below.
	function roleLegendSvg(roleKey, fillColor) {
		return roleSvg(roleKey, fillColor, 14)
	}

	function legendSvg(kind = "unknown") {
		return Utils.html`<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">${legendFragments[kind] ?? legendFragments.unknown}</svg>`
	}

	// Legend row for the category (document-type) group — see
	// categoryFragments above for where to swap in curated per-category
	// icons later.
	function categorySvg(category) {
		return Utils.html`<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">${categoryFragments[category] ?? categoryFragments.others}</svg>`
	}

	return {markerSvg, roleLegendSvg, legendSvg, categorySvg}
})()

export default Shapes
