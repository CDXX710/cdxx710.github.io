// ─────────────────────────────────────────────────────────────
// Config — every tunable value lives here, nowhere else.
// ─────────────────────────────────────────────────────────────
const Config = {
	map: {
		center: [15.5, -61.2],
		zoom: 8,
		maxZoom: 19
	},
	baseLayers: [
		{
			id: "light",
			label: "Light",
			tileUrl: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
			tileAttribution: '&copy; <a href="https://carto.com/">CARTO</a>',
			tileSubdomains: "abcd"
		},
		{
			id: "dark",
			label: "Dark",
			tileUrl: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
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
	// Rendering of the admin/water boundary polygons (BoundariesTopo / BoundariesData).
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
		hoverWeightBoost: 1.5
	}
}

export default Config
