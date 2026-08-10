// ─────────────────────────────────────────────────────────────
// dom-utils — tiny, generic DOM helpers with no panel/domain
// knowledge, shared by both the map/ controls (zoom, basemap) and
// the ui/ panels (legend, analytics, results).
// ─────────────────────────────────────────────────────────────

// Stops Leaflet from treating clicks/scrolls inside a floating UI
// element as map interactions (panning, zooming).
export function isolateFromMap(el) {
	L.DomEvent.disableScrollPropagation(el)
	L.DomEvent.disableClickPropagation(el)
}
