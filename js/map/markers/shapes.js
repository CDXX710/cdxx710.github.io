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
//
// Legend swatches (creoleRole and category) both use a flat,
// stroke-only rendering distinct from the filled map-marker badge —
// see roleLegendFragments/categoryFragments vs roleIconFragments/
// categoryMarkerFragments below.
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

	// Raw path data per creoleRole, native 24×24 coordinates — traced
	// from about.svg/using.svg/unknown.svg. Single source of truth for
	// the legend's flat rendering below (roleLegendFragments); the
	// filled map-marker badge (roleIconFragments, 1000×1000) is separate
	// and unaffected by this.
	const roleIconPaths24 = {
		about: `
		<path d="M2,6.38c0-1.38,1.12-2.5,2.5-2.5h15c1.38,0,2.5,1.12,2.5,2.5v7.5c0,1.38-1.12,2.5-2.5,2.5h-8.75l-5,3.75v-3.75h-1.25c-1.38,0-2.5-1.12-2.5-2.5v-7.5h0Z" />
		<circle cx="12" cy="6.19" r=".1" />
		<path d="M12,8.7v4.8" />
	`,
		using: `
		<path d="M2,6.4c0-1.38,1.12-2.49,2.5-2.49h15c1.38,0,2.5,1.11,2.5,2.49v7.47c0,1.38-1.12,2.49-2.5,2.49h-8.75l-5,3.73v-3.73h-1.25c-1.38,0-2.5-1.11-2.5-2.49v-7.47h0Z" />
		<path d="M6.76,8.25h10.49M6.76,12h5.24" />
	`,
		unknown: `
		<path d="M2,6.38c0-1.38,1.12-2.5,2.5-2.5h15c1.38,0,2.5,1.12,2.5,2.5v7.5c0,1.38-1.12,2.5-2.5,2.5h-8.75l-5,3.75v-3.75h-1.25c-1.38,0-2.5-1.12-2.5-2.5v-7.5h0Z" />
		<circle cx="12" cy="13.5" r=".1" />
		<path d="M10.13,7.77c0-1.04.84-1.87,1.87-1.87s1.87.84,1.87,1.87-.87,1.62-1.5,2.13c-.25.19-.37.5-.37.81v.5" />
	`
	}

	// Legend rendering for creoleRole — flat, stroke-coloured, no
	// background, exactly like categoryFragments below.
	const roleLegendFragments = Object.fromEntries(
		Object.entries(roleIconPaths24).map(([key, paths]) => [
			key,
			fill => Utils.html`
                <g class="shape-fill shape-fill--ring" fill="none" stroke="${fill}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5">${paths}</g>
            `
		])
	)

	// Generic abstract swatches — used by the Layers group only
	// (islands/waters/flags in boundaries.js), which predates and is
	// unrelated to creoleRole/authorType/category. Author-type rows use
	// the plain "unknown" dot; creoleRole rows use roleLegendFragments
	// above (flat outline, same treatment as categoryFragments) instead
	// of any of these.
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

	// Legend row for the creoleRole group — flat outline treatment,
	// same as categorySvg below. `fillColor` seeds the row's
	// `--shape-color` (set by the caller); the shape-fill class means
	// CSS actually drives the colour (and the is-off dimming).
	function roleLegendSvg(roleKey, fillColor) {
		const inner = (roleLegendFragments[roleKey] ?? roleLegendFragments.unknown)(fillColor)
		return Utils.html`<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`
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

	// ─── Author type ────────────────────────────────────────────
	// Raw path data per authorType, native 24×24 coordinates — traced
	// from admin.svg/clergy.svg/military.svg/poet.svg/trader.svg/
	// unknown.svg/writer.svg. Two source styles, kept as authored
	// rather than forced into one treatment:
	//   - "stroke" icons (admin, others) are line art — same
	//     fill:none/stroke:${color} wrapper as categoryFragments.
	//   - "solid" icons (clergy, merchant, poet, writer) are single
	//     filled glyphs — wrapped with fill:${color} instead.
	//   - military mixes a solid silhouette with a few cutout accents
	//     (originally white) that need their own group so they can
	//     stay transparent in the legend and show the marker's own
	//     circle colour on the map — see authorTypeMarkerFragments.
	const authorTypeStrokePaths = {
		admin: `
		<rect x="2" y="6" width="20" height="15" rx="2" ry="2" />
		<path d="M16,5v-1.78s-.01-.09-.59-.16c-.36-.04-.86-.07-1.41-.07h-4c-1.1,0-2,.1-2,.22v1.78" />
		<path d="M2,10c1.57,1,3.12,2.11,4.76,2.97h10.47c1.65-.87,3.22-1.99,4.77-2.97" />
		<rect x="11.5" y="12" width="1" height="2" />
	`,
		// Identical glyph to categoryIconPaths.others (unknown.svg) —
		// reused for the "unknown / other" author-type bucket too.
		others: categoryIconPaths.others
	}

	const authorTypeSolidPaths = {
		clergy: `
		<path d="M12.09,1c.1.05.19.1.29.17.88.63,1.7,1.33,2.48,2.07,2.08,1.98,4.03,4.57,4.68,7.4.12.52.19,1.02.22,1.55v.83s-.01.22-.01.22c-.14,1.96-.73,3.93-1.58,5.7v2.79c0,.59-.42,1.08-.95,1.26H6.76c-.51-.17-.94-.64-.94-1.21v-2.84c-.82-1.7-1.39-3.55-1.57-5.42l-.02-.11v-1.56c.1-.86.29-1.69.6-2.51.66-1.76,1.76-3.37,3.01-4.77,1.17-1.31,2.47-2.48,3.89-3.5l.17-.08h.2ZM15.11,18.39l-.1-13.68c-.94-.98-1.94-1.88-3.02-2.68-1.13.85-2.16,1.78-3.12,2.8l.1,13.56h6.14ZM18.82,13.5c.11-1.11,0-2.19-.33-3.24-.26-.84-.62-1.63-1.07-2.39-.44-.73-.91-1.42-1.49-2.09l.1,12.62h1.39c.72-1.53,1.22-3.18,1.39-4.89ZM5.42,15.06c.26,1.16.64,2.26,1.14,3.33h1.49s-.1-12.51-.1-12.51c-1.07,1.32-1.97,2.77-2.47,4.39-.51,1.62-.43,3.12-.07,4.79ZM17.25,21.71v-2.4s-8.59,0-8.59,0c-.11.03-.19.03-.28,0h-1.64s0,2.39,0,2.39c0,.22.17.43.41.43h9.7c.22-.01.41-.18.41-.42Z" />
		<path d="M12.45,13.12c0,.28-.2.48-.46.48s-.46-.2-.46-.47v-2.6s-1.05,0-1.05,0c-.27,0-.47-.22-.46-.47,0-.26.22-.46.48-.45h1.03s0-1.12,0-1.12c0-.27.2-.47.46-.47s.46.2.46.47v1.12s1.07,0,1.07,0c.25,0,.44.22.44.45s-.19.46-.44.46h-1.07s0,2.6,0,2.6Z" />
		<circle cx="13.14" cy="20.72" r=".46" />
		<circle cx="10.85" cy="20.72" r=".46" />
		<circle cx="15.43" cy="20.72" r=".46" />
		<circle cx="8.56" cy="20.72" r=".46" />
	`,
		merchant: `
		<path d="M11.51,17.31l-.39.45c-.29.34-.7.52-1.15.48-.4-.04-.81-.26-1.01-.64l-.2-.39c-.48.29-1.05.28-1.51-.01-.42-.27-.6-.74-.65-1.24-.88.08-1.52-.5-1.66-1.35-.32.04-.6-.03-.87-.16-.51-.25-.81-.77-.75-1.34.03-.29.16-.54.31-.79l.19-.32-1.63-1.12c-.21-.15-.25-.36-.11-.57l2.95-4.28c.07-.11.18-.16.29-.16.13,0,.21.06.3.14.69.6,1.59.86,2.49.69.36-.07.69-.19,1.02-.37.88-.47,1.9-.55,2.84-.21.38-.25.8-.35,1.25-.33.61.02,1.18.18,1.72.46.93.49,2.05.47,2.97-.05l.52-.34c.15-.1.38-.12.51.05l3,4.14c.11.15.08.38-.08.49l-1.68,1.13c.44.41.6.99.45,1.55-.12.44-.44.75-.88.87-.39.1-.79.08-1.19-.01-.02.26-.06.5-.17.73-.32.67-1.06.82-1.75.62,0,.24-.01.46-.08.68-.23.69-.95.93-1.64.78-.09.68-.49,1.13-1.15,1.28-.55.12-1.1-.02-1.55-.34l-.71-.49ZM12.6,8.16c.69-.51,1.69-.63,2.43-.14l4.53,3.19,1.58-1.06-2.57-3.55c-1.18.81-2.7.92-3.97.25-.44-.23-.9-.36-1.4-.38-.31-.01-.6.05-.86.24l-2.92,2.09c-.24.17-.29.49-.18.74s.43.32.71.35c.16.02.32,0,.46-.1l2.19-1.62ZM15.87,14.99l-1.94-1.27c-.17-.11-.17-.34-.08-.48s.31-.2.47-.1l2.26,1.47c.23.15.52.19.78.15.49-.06.55-.65.47-1.12l-2.61-1.83c-.16-.11-.19-.33-.08-.49.08-.13.31-.22.47-.11l2.94,2.05c.15.1.31.14.48.15.39.03.82,0,.92-.39.08-.29,0-.68-.27-.87l-4.98-3.51c-.24-.17-.51-.25-.81-.22s-.57.1-.81.27l-2.26,1.66c-.45.33-1.12.28-1.62.06-.46-.21-.74-.65-.72-1.16,0-.41.19-.8.53-1.04l2.22-1.59c-.61-.11-1.19,0-1.71.28-1.36.74-2.82.71-4.1-.2l-2.57,3.73,1.43.99c.2-.21.44-.36.72-.45.39-.11.79-.05,1.13.17.32.17.55.46.64.82.32-.06.62-.07.93,0,.59.13,1,.62,1.05,1.23.53,0,1.08.08,1.46.46.3.3.41.71.38,1.15.32.04.6.11.87.26.62.33.85,1.07.5,1.7l.78.54c.3.21.69.23,1.02.11.37-.15.49-.5.47-.89l-1.57-1.09c-.17-.12-.22-.33-.1-.5.09-.14.31-.22.47-.1l1.76,1.22c.21.14.46.17.69.14.53-.07.51-.7.39-1.19ZM5.23,13.67l.65-.7c.18-.31.33-.75.1-1.03-.15-.18-.38-.3-.61-.31-.46-.02-.85.55-1.07.94l-.23.4c-.14.36.02.69.36.85.29.13.57.1.8-.15ZM7.03,14.97l.91-1.31c.18-.26.11-.62-.09-.83-.24-.25-.75-.23-1.1-.13-.09.24-.14.5-.31.69l-.82.91c.02.48.25.93.75.96.24.02.51-.06.66-.28ZM7.64,16.6c.29.18.68.13.9-.13l1.12-1.3c.16-.19.23-.39.21-.64-.06-.59-.7-.66-1.25-.63l-.1.16-.92,1.31c-.08.12-.19.2-.3.29,0,.33.06.74.34.92ZM10.55,17.33l.75-.86c.12-.13.14-.33.08-.5-.1-.34-.68-.47-1.06-.48l-1.01,1.17c.13.38.28.81.68.86.21.03.41-.03.56-.19Z" />
	`,
		poet: `
		<path d="M5.01,18.44c.31-.47.62-.91.99-1.34,1.76-2.06,4.31-4.06,6.64-5.44.79-.47,1.55-.93,2.29-1.48s1.4-1.1,2.07-1.74c-.32.64-1.32,1.48-1.91,1.9l-2.14,1.5-3.09,2.15c-.85.59-1.61,1.25-2.36,1.97-1.42,1.38-2.67,2.91-3.74,4.57-.3.46-.52.92-.6,1.46l2.84-4.1c.26-.04.5.15.58.37.09-.25-.02-.48-.22-.65.34-.07.61.1.86.32,0-.23-.14-.38-.31-.51,1.24.34,2.49.17,3.42-.78-.63.07-1.25-.09-1.78-.45,2.3.37,4.3-.59,5.51-2.52l-2.13-.09c.76-.09,1.48-.19,2.2-.43,1.41-.47,2.73-1.35,3.46-2.7-.72.18-1.42.39-2.2.27,1.05-.11,2.09-.41,3-1.04.65-.46,1.2-1.01,1.58-1.74l-1.72.34,2.08-.92c.46-1.27.7-2.72.4-4.06-.1-.47-.26-.91-.52-1.31.14,1.03-.61,1.9-1.38,2.5l-.12,1.25-.23-1.08c-.18.86-.99,1.46-1.66,1.97-.84.63-1.31.84-1.45,2.08l-.13-1.28c-.22.27-.45.49-.75.68-.56.37-1.14.67-1.76.94l-1.45.64c-.33.14-.25,1.17-.17,1.7-.46-.31-.62-.86-.68-1.43-.9.3-2.12.73-2.77,1.35-.17.16-.22.36-.22.59,0,.58.13,1.12.31,1.69-.43-.42-.7-.94-.84-1.51l-.89.7c-.28.22-.51.48-.73.75-.53.67-.15,1.57.17,2.29-.37-.1-.6-.34-.79-.64h-.05c-.15.88.2,1.75.61,2.52-.4-.25-.84-.29-1.26-.18.46.07.85.25,1.07.64-.26,0-.5.05-.73.18-.04.05,0,.06.04.02.22-.06.41-.05.66.04Z" />
	`,
		writer: `
		<path d="M9.17,17.41l-2.55-2.55S14.34,4.72,17.96,2.67c.74-.42,2.8-.6,3.4,0s.42,2.66,0,3.4c-2.06,3.62-12.19,11.34-12.19,11.34ZM20.94,5.64s.45-2.1,0-2.55-2.55,0-2.55,0l2.55,2.55ZM19.24,5.36l-6.52,6.81-.77-.08-.08-.77,6.81-6.52-.88-.88-8.7,9.33,1.69,1.72,9.31-8.75-.85-.85ZM8.46,18.12c-.42.64.27,1.58,0,2.55-1.67.25-2.36.33-3.83,1.28h-2.55c-.14.03-.09-2.41,0-2.55.74-1.19,1.1-2.35,1.28-3.83.89-.41,1.91.57,2.55,0M7.19,19.39l.56-1.98-1.13-1.13-1.98.56-1.28,3.83c1.01-.46,2.73-1.07,3.83-1.28Z" />
	`
	}

	const militaryMainPath = `
		<path d="M19.98,2.18c.54,0,1.05.21,1.43.59.38.38.59.89.59,1.43,0,.54-.21,1.05-.59,1.43l-2.76,2.76,1.09,1.09c.32.32.32.83,0,1.14-.32.32-.83.32-1.14,0l-.9-.9-2.44,2.44,2.59,2.59c1.37,1.37,2.46,2.97,3.25,4.74l.53,1.2c.13.31.07.66-.17.9-.24.24-.59.3-.9.17l-1.2-.53c-1.78-.78-3.37-1.87-4.74-3.25l-2.59-2.59-2.59,2.59c-1.37,1.37-2.97,2.46-4.74,3.25h0l-1.2.53c-.31.13-.66.07-.9-.17-.24-.24-.3-.59-.17-.9l.53-1.2c.78-1.78,1.87-3.37,3.25-4.74l2.59-2.59-2.46-2.46-.92.92c-.32.32-.83.32-1.14,0-.32-.32-.32-.83,0-1.14l1.09-1.09-2.76-2.76c-.38-.38-.59-.89-.59-1.43s.21-1.05.59-1.43c.79-.79,2.07-.79,2.86,0l2.76,2.76,1.09-1.09c.32-.32.83-.32,1.14,0,.32.32.32.83,0,1.14l-.88.88,2.46,2.46,2.44-2.44-.9-.9c-.32-.32-.32-.83,0-1.14.32-.32.83-.32,1.14,0l1.09,1.09,2.76-2.76c.38-.38.89-.59,1.43-.59Z" />
	`
	// Detail accents — white in the original two-tone artwork. In the
	// legend they stay transparent (a gap in the silhouette); on the
	// map marker they're drawn in the badge's own fill colour, see
	// authorTypeMarkerFragments below.
	const militaryCutoutPaths = `
		<path d="M17.5,7.24l2.76-2.76c.1-.1.12-.22.12-.29,0-.06-.02-.18-.12-.29-.16-.16-.41-.16-.57,0h0l-2.76,2.76.57.57Z" />
		<path d="M7.07,6.67l-2.76-2.76c-.16-.16-.41-.16-.57,0-.1.1-.12.22-.12.29s.02.18.12.29h0s2.76,2.76,2.76,2.76l.57-.57Z" />
		<polygon points="15.92 7.95 15.6 7.63 13.16 10.07 14.11 11.01 16.55 8.58 15.92 7.95" />
		<path d="M11.3,10.49l-2.86-2.86-.94.94,8.26,8.26c1.03,1.03,2.2,1.89,3.49,2.55-.66-1.29-1.52-2.46-2.55-3.49l-3.01-3.01c-.06-.03-.12-.08-.17-.13l-2.09-2.09c-.05-.05-.09-.11-.13-.17Z" />
		<path d="M10.86,14.27l-.94-.94-2.57,2.57c-1.03,1.03-1.89,2.2-2.55,3.49,1.29-.66,2.46-1.52,3.49-2.55l2.57-2.57Z" />
	`

	const authorTypeFragments = {
		...Object.fromEntries(
			Object.entries(authorTypeStrokePaths).map(([key, paths]) => [
				key,
				fill => Utils.html`
                    <g class="shape-fill shape-fill--ring" fill="none" stroke="${fill}" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">${paths}</g>
                `
			])
		),
		...Object.fromEntries(Object.entries(authorTypeSolidPaths).map(([key, paths]) => [key, fill => Utils.html`<g class="shape-fill" fill="${fill}">${paths}</g>`])),
		military: fill => Utils.html`
            <g class="shape-fill" fill="${fill}">${militaryMainPath}</g>
            <g fill="none">${militaryCutoutPaths}</g>
        `
	}

	const authorTypeMarkerFragments = {
		...Object.fromEntries(
			Object.entries(authorTypeStrokePaths).map(([key, paths]) => [
				key,
				fill => Utils.html`
				    <circle class="shape-fill" cx="500" cy="500" r="500" fill="${fill}" />
				    <g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" transform="translate(250,250) scale(20.8333)">${paths}</g>
			    `
			])
		),
		...Object.fromEntries(
			Object.entries(authorTypeSolidPaths).map(([key, paths]) => [
				key,
				fill => Utils.html`
				    <circle class="shape-fill" cx="500" cy="500" r="500" fill="${fill}" />
				    <g fill="#fff" transform="translate(250,250) scale(20.8333)">${paths}</g>
			    `
			])
		),
		military: fill => Utils.html`
            <circle class="shape-fill" cx="500" cy="500" r="500" fill="${fill}" />
            <g fill="#fff" transform="translate(250,250) scale(20.8333)">${militaryMainPath}</g>
            <g fill="${fill}" transform="translate(250,250) scale(20.8333)">${militaryCutoutPaths}</g>
        `
	}

	// Map marker: author-type icon, sized up, with a soft glow —
	// same treatment as categoryMarkerSvg.
	function authorTypeMarkerSvg(authorType, fillColor) {
		const inner = (authorTypeMarkerFragments[authorType] ?? authorTypeMarkerFragments.others)(fillColor)
		const glow = `filter:drop-shadow(0 0 0.25rem ${fillColor})`
		return Utils.html`<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 1000 1000" style="overflow:visible; ${glow};">${inner}</svg>`
	}

	// Legend/analytics row for author type — same flat treatment as
	// categorySvg/roleLegendSvg.
	function authorTypeSvg(authorType, fillColor) {
		const inner = (authorTypeFragments[authorType] ?? authorTypeFragments.others)(fillColor)
		return Utils.html`<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`
	}

	return {
		markerSvg,
		categoryMarkerSvg,
		authorTypeMarkerSvg,
		roleLegendSvg,
		legendSvg,
		categorySvg,
		authorTypeSvg
	}
})()

export default Shapes
