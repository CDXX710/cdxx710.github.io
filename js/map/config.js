// ─────────────────────────────────────────────────────────────
// Config — every tunable value lives here, nowhere else.
// ─────────────────────────────────────────────────────────────

// CARTO basemap tiles are named "{theme}_{labelsSuffix}", e.g.
// light_all, dark_all, light_nolabels, dark_nolabels. buildBaseTileUrl
// assembles the right URL from a theme ("light"/"dark") and a labels
// mode ("all"/"no_labels") instead of every base layer hardcoding its
// own near-identical URL.
const CARTO_BASE_TILE_URL = "https://{s}.basemaps.cartocdn.com/{style}/{z}/{x}/{y}{r}.png"

function buildBaseTileUrl(theme, labels) {
	const labelsSuffix = labels === "all" ? "all" : "nolabels"
	return CARTO_BASE_TILE_URL.replace("{style}", `${theme}_${labelsSuffix}`)
}

const Config = {
	map: {
		center: [15.5, -61.2],
		zoom: 8,
		maxZoom: 19
	},
	buildBaseTileUrl,
	// Default labels mode for base layers: "all" shows place/road labels,
	// "no_labels" hides them. Independent of which base layer (light/dark) is active.
	defaultLabelsMode: "all",
	baseLayers: [
		{
			id: "light",
			label: "Light",
			theme: "light",
			tileAttribution: '&copy; <a href="https://carto.com/">CARTO</a>',
			tileSubdomains: "abcd"
		},
		{
			id: "dark",
			label: "Dark",
			theme: "dark",
			tileAttribution: '&copy; <a href="https://carto.com/">CARTO</a>',
			tileSubdomains: "abcd"
		}
	],
	// Overlay layers: optional historical maps drawn on top of whichever base layer is active.
	// Selecting one deselects the other (mutually exclusive amongst themselves), but either
	// can be toggled off entirely to show just the base layer beneath.
	overlayLayers: [
		{
			id: "atlas",
			label: "World Atlas",
			tileUrl: "https://wmts.oldmapsonline.org/maps/bca48631-ffd0-5797-a725-21d54ac4f67b/2017-11-01T22:10:49.806598Z/{z}/{x}/{y}.png?key=L9mp0mSv8QUT19QPhCnL",
			tileAttribution: '&copy; <a href="https://www.oldmapsonline.org/">Old Maps Online</a>',
			tileSubdomains: "",
			opacity: 0.85
		},
		{
			id: "piccole",
			label: "Piccole",
			tileUrl: "https://wmts.oldmapsonline.org/maps/6091e498-082d-4e3e-a8d4-dd34aa26be74/2024-07-29T16:34:18.856393Z/{z}/{x}/{y}.png?key=L9mp0mSv8QUT19QPhCnL",
			tileAttribution: '&copy; <a href="https://www.oldmapsonline.org/">Old Maps Online</a>',
			tileSubdomains: "",
			opacity: 0.85
		}
	],
	defaultBaseLayerId: window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark",
	defaultOverlayLayerId: null,
	popup: {maxWidth: 512},
	search: {debounceMs: 200},
	flyTo: {minZoom: 11},
	searchbarAnimationMs: 200,
	// How close together (ms) two pointer-downs on the polygon tool need to be
	// to count as "close the polygon", for mouse, touch, and pen alike.
	polygonCloseTapMs: 300,
	// Rendering of the admin/water boundary polygons (BoundariesTopoFine /
	// BoundariesTopoCoarse, or BoundariesData for a plain-geojson source).
	// `typeProperty` + `waterTypeValues` decide which features are drawn as "water"
	// vs "island" — adjust these to match whatever property your boundary source
	// actually uses (run `console.table(BoundaryData.getFeatures().map(f => f.properties))`
	// in the console to inspect it). Any feature whose typeProperty value isn't in
	// waterTypeValues is treated as an island by default.
	boundaries: {
		enabled: true,
		typeProperty: "TYPE",
		waterTypeValues: ["water", "sea", "ocean", "maritime", "eez"],
		nameProperty: "NAME_0",
		flagProperty: "FLAG",
		showFlagsByDefault: true,
		flagSize: 22,
		island: {color: "#3f8a5c", weight: 1.25, fillColor: "#4f9d76", fillOpacity: 0.14, dashArray: null},
		water: {color: "#3a7ca5", weight: 1, fillColor: "#3a7ca5", fillOpacity: 0.08, dashArray: "4 3"},
		hoverWeightBoost: 1.5,
		// Below this zoom, BoundaryData serves BoundariesTopoCoarse (~7% of the
		// source point count); at or above it, BoundariesTopoFine (~19%). This
		// is where redraw cost (especially on canvas) is worst — more geometry
		// visible at once — and where the extra detail is least perceptible.
		simplifyZoomThreshold: 9
	}
}

export default Config
