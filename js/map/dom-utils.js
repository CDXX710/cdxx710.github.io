// ─────────────────────────────────────────────────────────────
// dom-utils — tiny, generic DOM helpers with no panel/domain
// knowledge, shared across map/, markers/, and ui/ modules.
// ─────────────────────────────────────────────────────────────

// Stops Leaflet from treating clicks/scrolls inside a floating UI
// element as map interactions (panning, zooming).
export function isolateFromMap(el) {
	L.DomEvent.disableScrollPropagation(el)
	L.DomEvent.disableClickPropagation(el)
}
