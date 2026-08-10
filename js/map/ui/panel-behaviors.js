import Utils from "../utils.js"
import {isolateFromMap} from "../dom-utils.js"
import EventBus from "../event-bus.js"

// ─────────────────────────────────────────────────────────────
// panel-behaviors — shared building blocks for the collapsible
// floating panels (Legend, AnalyticsPanel, SelectionResults):
// the collapse/expand state machine, the "<title> ... <collapse
// button>" header, and the narrow-viewport check they all use to
// decide their starting collapsed state.
//
// Panel-specific CSS class names (e.g. "legend-panel__title") are
// kept so no CSS changes are needed — callers pass their own
// `prefix`/classnames in; this module only removes the duplicated
// *pattern*, not each panel's own styling hooks.
// ─────────────────────────────────────────────────────────────

export {isolateFromMap}

// Must match the mobile breakpoint in css/map/responsive.css
// (`@media (max-width: 30rem)`), where the legend/analytics/results
// panels switch to the bottom-sheet layout. CSS custom properties
// can't be read from inside a media query condition, so this is kept
// in sync by hand — if that breakpoint ever changes, update both.
export const NARROW_VIEWPORT_QUERY = "(max-width: 30rem)"

export function isNarrowViewport() {
	return window.matchMedia(NARROW_VIEWPORT_QUERY).matches
}

const collapseChevronSvg = Utils.html`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="2,9 7,4 12,9" /></svg>`

// Fills in a panel's "<title> ...... <collapse button>" header row.
// `headerEl` is the (empty) header container already in the static
// markup; `prefix` (e.g. "legend-panel") supplies the panel-specific
// class hooks CSS depends on (`${prefix}__title`,
// `${prefix}__collapse-btn`). `extraEl`, if given, is inserted
// between the title and the collapse button — e.g. Legend's "N
// hidden by filters" notice.
//
// The collapse button is returned with no aria-expanded/aria-label
// set: every caller creates its `createCollapsible` right after this
// and calls `setCollapsed(initialState)` immediately, which is the
// only place those attributes are written. Deliberately not writing
// a default here (rather than a "safe-looking" one that's wrong for
// panels that start collapsed) means there's never an incorrect
// value in the DOM, even transiently, for it to flash.
export function mountHeader(headerEl, prefix, {title, extraEl} = {}) {
	if (title) headerEl.appendChild(Utils.el("span", {className: `${prefix}__title`, text: title}))
	if (extraEl) headerEl.appendChild(extraEl)
	const collapseBtn = Utils.el("button", {
		type: "button",
		className: `collapse-btn ${prefix}__collapse-btn`,
		html: collapseChevronSvg
	})
	headerEl.appendChild(collapseBtn)
	return collapseBtn
}

// Collapse/expand behavior shared by Legend, AnalyticsPanel and
// SelectionResults: toggles `collapsedClass` on `panelEl` and syncs
// the collapse button's aria state. `bodyEl` is optional — pass it
// when the panel's CSS collapse transition keys off a separate
// wrapper's `data-collapsed` attribute (Legend, AnalyticsPanel);
// omit it when the panel only needs the `collapsedClass` toggle on
// `panelEl` itself (SelectionResults).
//
// `name`, if given, is broadcast on the shared `"panel:collapseChanged"`
// EventBus event every time setCollapsed runs — this is how
// Legend/SelectionResults mutually collapse each other on desktop to
// avoid overlapping (see their own EventBus.on("panel:collapseChanged", ...)
// listeners); panels that don't pass `name` (e.g. AnalyticsPanel) simply
// don't participate.
export function createCollapsible({panelEl, collapseBtn, bodyEl, collapsedClass = "is-collapsed", expandLabel, collapseLabel, name}) {
	function setCollapsed(collapsed) {
		panelEl.classList.toggle(collapsedClass, collapsed)
		if (bodyEl) bodyEl.dataset.collapsed = String(collapsed)
		collapseBtn.setAttribute("aria-expanded", String(!collapsed))
		collapseBtn.setAttribute("aria-label", collapsed ? expandLabel : collapseLabel)
		if (name) EventBus.emit("panel:collapseChanged", {name, collapsed})
	}
	function isCollapsed() {
		return panelEl.classList.contains(collapsedClass)
	}
	return {setCollapsed, isCollapsed}
}
