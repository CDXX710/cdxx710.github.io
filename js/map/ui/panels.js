import Utils from "../utils.js"

// ─────────────────────────────────────────────────────────────
// Panels — shared floating-panel behaviour used by Legend,
// AnalyticsPanel, and SelectionResults: keeping map gestures from
// leaking through a panel, generic collapse/expand, and a shared
// header builder so each panel doesn't hand-roll its own header markup.
// ─────────────────────────────────────────────────────────────
const Panels = (() => {
	function isolateFromMap(el) {
		L.DomEvent.disableScrollPropagation(el)
		L.DomEvent.disableClickPropagation(el)
	}

	function createCollapsible({panelEl, headerEl, collapseBtn, bodyEl, collapsedClass = "is-collapsed", expandLabel, collapseLabel, extraDividers = []}) {
		let dividerEl = null
		function ensureDivider() {
			if (!dividerEl && headerEl) {
				dividerEl = Utils.el("div", {className: "legend-divider", role: "separator"})
				headerEl.insertAdjacentElement("afterend", dividerEl)
			}
			return dividerEl
		}
		function setCollapsed(collapsed) {
			panelEl.classList.toggle(collapsedClass, collapsed)
			collapseBtn.setAttribute("aria-expanded", String(!collapsed))
			collapseBtn.setAttribute("aria-label", collapsed ? expandLabel : collapseLabel)
			// The divider between header and body only makes sense while the
			// body is actually showing, so it's inserted/hidden in lockstep
			// with the expanded state rather than living in the panel always.
			if (!collapsed) {
				const divider = ensureDivider()
				if (divider) divider.hidden = false
				extraDividers.forEach(el => {
					el.hidden = false
				})
				if (bodyEl) bodyEl.style.maxHeight = `${bodyEl.scrollHeight}px`
			} else {
				if (dividerEl) dividerEl.hidden = true
				extraDividers.forEach(el => {
					el.hidden = true
				})
			}
		}
		function isCollapsed() {
			return panelEl.classList.contains(collapsedClass)
		}
		return {setCollapsed, isCollapsed}
	}

	const collapseChevronSvg = Utils.html`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="2,9 7,4 12,9" /></svg>`

	// Builds a "<title> ...... <collapse button>" header row. `title` is
	// optional.
	// Returns {headerEl, collapseBtn} as expected by createCollapsible.
	function buildHeader({title, collapseLabel}) {
		const headerEl = Utils.el("div", {className: "legend__header"})

		if (title) {
			headerEl.appendChild(Utils.el("span", {className: "legend__title", text: title}))
		}

		const collapseBtn = Utils.el("button", {
			className: "collapse-btn legend__collapse-btn",
			"aria-label": collapseLabel,
			"aria-expanded": "false",
			html: collapseChevronSvg
		})
		headerEl.appendChild(collapseBtn)

		return {headerEl, collapseBtn}
	}

	return {isolateFromMap, createCollapsible, buildHeader}
})()

export default Panels
