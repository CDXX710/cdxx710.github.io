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
            <g class="shape-fill" fill="${fill}" stroke="${fill}" stroke-linecap="round" stroke-width="48">
                <circle stroke="none" cx="500" cy="345" r="32" />
                <path fill="none" d="M500,412v128" />
            </g>
        `,
		using: fill => Utils.html`
            <circle class="shape-fill" cx="500" cy="500" r="500" fill="${fill}" />
            <path fill="#fff" d="M233,350.46c0-36.72,29.87-66.46,66.75-66.46h400.5c36.88,0,66.75,29.74,66.75,66.46v199.38c0,36.72-29.87,66.46-66.75,66.46h-233.62l-133.5,99.69v-99.69h-33.37c-36.88,0-66.75-29.74-66.75-66.46v-199.38Z" />
            <g class="shape-fill" fill="none" stroke="${fill}" stroke-linecap="round" stroke-width="48">
                <path d="M360,400h280M360,500h140" />
            </g>
        `,
		unknown: fill => Utils.html`
            <circle class="shape-fill" cx="500" cy="500" r="500" fill="${fill}" />
            <path fill="#fff" d="M233.33,350c0-36.83,29.83-66.67,66.67-66.67h400c36.83,0,66.67,29.83,66.67,66.67v200c0,36.83-29.83,66.67-66.67,66.67h-233.33l-133.33,100v-100h-33.33c-36.83,0-66.67-29.83-66.67-66.67v-200Z" />
            <g class="shape-fill" fill="${fill}" stroke="${fill}" stroke-linecap="round" stroke-width="48">
                <circle stroke="none" cx="500" cy="540" r="24" />
                <path fill="none" d="M450,387.17c0-27.67,22.33-50,50-50s50,22.33,50,50-23.33,43.33-40,56.67c-6.67,5-10,13.33-10,21.67v13.33" />
            </g>
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

	// Raw path data per category, still in native 24×24 coordinates —
	// the single source of truth for both renderings below.
	const categoryIconPaths = {
		bible: `
		<path d="M3,19.5V4.5c0-1.38,1.26-2.5,2.81-2.5h15.19v20H5.81c-1.55,0-2.81-1.12-2.81-2.5s1.26-2.5,2.81-2.5h15.19" />
		<path d="M12,6v7" />
		<path d="M9.5,8.5h5" />
	`,
		letter: `
		<rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
		<path d="M22,7l-8.97,5.7c-.63.39-1.43.39-2.06,0L2,7" />
	`,
		notes: `
		<path d="M16,2H5c-1.1,0-2,.99-2,2.22v15.56c0,1.23.9,2.22,2,2.22h14c1.1,0,2-.99,2-2.22V7.56l-5-5.56Z" />
		<path d="M15,2v6h6" />
		<path d="M8,12h8" />
		<path d="M8,16h5" />
	`,
		poem: `
		<path d="M6.44,22h13.33c1.22,0,2.22-.9,2.22-2v-1c0-.55-.5-1-1.11-1h-11.11c-1.84,0-3.33,1.34-3.33,3v1Z" />
		<path d="M19.22,17V5c0-1.1-.07-2-.14-2h-.97" />
		<path d="M14.22,14h-4.44" />
		<path d="M14.22,10h-4.44" />
		<path d="M4.78,7v12c0,1.1.07,2,.14,2h.97" />
		<path d="M17.56,2H4.22c-1.22,0-2.22.9-2.22,2v1c0,.55.5,1,1.11,1h11.11c1.84,0,3.33-1.34,3.33-3v-1Z" />
	`,
		report: `
		<path d="M15,2h-6c-.55,0-1,.45-1,1v2c0,.55.45,1,1,1h6c.55,0,1-.45,1-1v-2c0-.55-.45-1-1-1Z" />
		<path d="M16,4h2c1.1,0,2,.9,2,2v14c0,1.1-.9,2-2,2H6c-1.1,0-2-.9-2-2V6c0-1.1.9-2,2-2h2" />
		<path d="M12,11v6" />
		<path d="M8,14v3" />
		<path d="M16,13v4" />
	`,
		roman: `
		<path d="M22,5v15.94h-7c-1.66,0-3,1.06-3,1.06,0,0-1.34-1.06-3-1.06H2V5" />
		<line x1="12" y1="5" x2="12" y2="19" />
		<path d="M12,21c0-1.75,1.34-3.17,3-3.17h6s0-15.83,0-15.83h-5c-2.21,0-4,1.89-4,4.22,0-2.33-1.79-4.22-4-4.22H3v15.83h6c1.66,0,3,1.42,3,3.17Z" />
	`,
		others: `
		<circle cx="12" cy="12" r="10" />
		<path d="M9,8c.84-1.83,2.92-2.46,4.39-1.69,1.19.63,1.95,2.19,1.46,3.65-.41,1.22-1.51,2.04-2.85,2.04v2" />
		<path d="M12,17h0" />
	`
	}

	// Legend/analytics rendering: flat, stroke-coloured, no background
	const categoryFragments = Object.fromEntries(
		Object.entries(categoryIconPaths).map(([key, paths]) => [
			key,
			fill => Utils.html`
                <g class="shape-fill shape-fill--ring" fill="none" stroke="${fill}" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">${paths}</g>
            `
		])
	)

	// Map-marker rendering: same treatment as roleIconFragments
	const categoryMarkerFragments = Object.fromEntries(
		Object.entries(categoryIconPaths).map(([key, paths]) => [
			key,
			fill => Utils.html`
			    <circle class="shape-fill" cx="500" cy="500" r="500" fill="${fill}" />
			    <g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" transform="translate(250,250) scale(20.8333)">${paths}</g>
		    `
		])
	)

	function roleSvg(roleKey, fillColor, pxSize) {
		const inner = (roleIconFragments[roleKey] ?? roleIconFragments.unknown)(fillColor)
		return Utils.html`<svg xmlns="http://www.w3.org/2000/svg" width="${pxSize}" height="${pxSize}" viewBox="0 0 1000 1000" style="overflow:visible;" aria-hidden="true">${inner}</svg>`
	}

	// Map marker: role icon, sized up, with a soft glow
	function markerSvg(roleKey, fillColor) {
		const inner = (roleIconFragments[roleKey] ?? roleIconFragments.unknown)(fillColor)
		const glow = `filter:drop-shadow(0 0 0.25rem ${fillColor})`
		return Utils.html`<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 1000 1000" style="overflow:visible; ${glow};">${inner}</svg>`
	}

	// Map marker: category icon, sized up, with a soft glow
	function categoryMarkerSvg(category, fillColor) {
		const inner = (categoryMarkerFragments[category] ?? categoryMarkerFragments.others)(fillColor)
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
	// markers/shapes.js
	function categorySvg(category, fillColor) {
		const inner = (categoryFragments[category] ?? categoryFragments.others)(fillColor)
		return Utils.html`<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`
	}

	return {markerSvg, categoryMarkerSvg, roleLegendSvg, legendSvg, categorySvg}
})()

export default Shapes
