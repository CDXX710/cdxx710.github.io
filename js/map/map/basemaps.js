import Config from "../config.js"
import EventBus from "../event-bus.js"
import MapCore from "./map-core.js"
import Utils from "../utils.js"
import {isolateFromMap} from "../dom-utils.js"

// ─────────────────────────────────────────────────────────────
// Basemaps — base layer (radio) + historical overlay (optional, at
// most one) switching, plus the floating control that drives both.
// ─────────────────────────────────────────────────────────────
const Basemaps = (() => {
	let baseLayerInstances = new Map()
	let currentBaseId = null
	let overlayLayerInstances = new Map()
	let currentOverlayId = null
	let currentLabelsMode = Config.defaultLabelsMode ?? "no_labels"

	function baseLayerFor(def) {
		if (!baseLayerInstances.has(def.id)) {
			baseLayerInstances.set(
				def.id,
				L.tileLayer(Config.buildBaseTileUrl(def.theme, currentLabelsMode), {
					attribution: def.tileAttribution,
					subdomains: def.tileSubdomains ?? "abc",
					maxZoom: Config.map.maxZoom
				})
			)
		}
		return baseLayerInstances.get(def.id)
	}

	function overlayLayerFor(def) {
		if (!overlayLayerInstances.has(def.id)) {
			overlayLayerInstances.set(
				def.id,
				L.tileLayer(def.tileUrl, {
					attribution: def.tileAttribution,
					subdomains: def.tileSubdomains ?? "abc",
					maxZoom: Config.map.maxZoom,
					maxNativeZoom: def.maxNativeZoom ?? Config.map.maxZoom,
					opacity: def.opacity ?? 0.85,
					pane: "overlayPane",
					updateWhenZooming: false,
					keepBuffer: 4,
					bounds: def.bounds ? L.latLngBounds(def.bounds) : undefined
				})
			)
		}
		return overlayLayerInstances.get(def.id)
	}
	function setBase(id) {
		const def = Config.baseLayers.find(b => b.id === id)
		if (!def || id === currentBaseId) return
		const nextLayer = baseLayerFor(def)
		if (currentBaseId) {
			const prevDef = Config.baseLayers.find(b => b.id === currentBaseId)
			MapCore.map.removeLayer(baseLayerFor(prevDef))
		}
		nextLayer.addTo(MapCore.map)
		currentBaseId = id

		EventBus.emit("basemap:baseChanged", def)
	}

	// Labels toggle is independent of which base layer (light/dark) is
	// active: it just swaps every cached base layer's tile URL between
	// the "all" and "no_labels" CARTO variants in place.
	function setLabels(mode) {
		if (mode === currentLabelsMode) return
		currentLabelsMode = mode
		Config.baseLayers.forEach(def => {
			const layer = baseLayerInstances.get(def.id)
			if (layer) layer.setUrl(Config.buildBaseTileUrl(def.theme, currentLabelsMode))
		})
		EventBus.emit("basemap:labelsChanged", currentLabelsMode)
	}

	function toggleLabels() {
		setLabels(currentLabelsMode === "all" ? "no_labels" : "all")
	}

	function setOverlay(id) {
		// Passing null (or the currently-active id, to allow toggling off) clears the overlay.
		const nextId = id === currentOverlayId ? null : id
		if (currentOverlayId) {
			const prevDef = Config.overlayLayers.find(o => o.id === currentOverlayId)
			MapCore.map.removeLayer(overlayLayerFor(prevDef))
		}
		currentOverlayId = nextId
		if (nextId) {
			const def = Config.overlayLayers.find(o => o.id === nextId)
			overlayLayerFor(def).addTo(MapCore.map)
		}
		EventBus.emit("basemap:overlayChanged", currentOverlayId)
	}

	function buildBaseControl(row) {
		const buttons = Config.baseLayers.map(def => {
			const btn = Utils.el("button", {
				type: "button",
				className: "basemap-panel__btn" + (def.id === currentBaseId ? " is-active" : ""),
				"data-basemap": def.id,
				"aria-pressed": String(def.id === currentBaseId),
				text: def.label
			})
			btn.addEventListener("click", () => setBase(def.id))
			return btn
		})
		buttons.forEach(btn => row.appendChild(btn))
		EventBus.on("basemap:baseChanged", layer => {
			buttons.forEach(btn => {
				const isActive = btn.dataset.basemap === layer.id
				btn.classList.toggle("is-active", isActive)
				btn.setAttribute("aria-pressed", String(isActive))
			})
		})
	}

	function buildLabelsToggle(row) {
		const btn = Utils.el("button", {
			type: "button",
			className: "basemap-panel__btn basemap-panel__btn--labels" + (currentLabelsMode === "all" ? " is-active" : ""),
			"data-labels-toggle": "",
			"aria-pressed": String(currentLabelsMode === "all"),
			title: "Toggle place labels",
			text: "Labels"
		})
		btn.addEventListener("click", () => toggleLabels())
		row.appendChild(btn)
		EventBus.on("basemap:labelsChanged", mode => {
			const isActive = mode === "all"
			btn.classList.toggle("is-active", isActive)
			btn.setAttribute("aria-pressed", String(isActive))
		})
	}

	function buildOverlayControl(row) {
		const buttons = Config.overlayLayers.map(def => {
			const btn = Utils.el("button", {
				type: "button",
				className: "basemap-panel__btn basemap-panel__btn--overlay",
				"data-overlay": def.id,
				"aria-pressed": "false",
				title: `Toggle ${def.label} overlay on top of the base map`,
				text: def.label
			})
			btn.addEventListener("click", () => setOverlay(def.id))
			return btn
		})
		buttons.forEach(btn => row.appendChild(btn))
		EventBus.on("basemap:overlayChanged", activeId => {
			buttons.forEach(btn => {
				const isActive = btn.dataset.overlay === activeId
				btn.classList.toggle("is-active", isActive)
				btn.setAttribute("aria-pressed", String(isActive))
			})
		})
	}

	// Markup (the panel shell + both rows) lives statically in map.html
	// (#basemap-panel); only the per-layer buttons are data-driven from
	// Config, so those are the only pieces built here.
	function buildControl() {
		const control = document.getElementById("basemap-panel")
		const baseRow = document.getElementById("basemap-panel__base-row")
		buildBaseControl(baseRow)
		buildLabelsToggle(baseRow)
		buildOverlayControl(document.getElementById("basemap-panel__overlay-row"))
		isolateFromMap(control)
	}

	function init() {
		buildControl()
		setBase(Config.defaultBaseLayerId ?? Config.baseLayers[0].id)
		if (Config.defaultOverlayLayerId) setOverlay(Config.defaultOverlayLayerId)
	}

	return {init, setBase, setOverlay, setLabels, toggleLabels}
})()

export default Basemaps
