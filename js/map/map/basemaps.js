import Config from "../config.js"
import EventBus from "../event-bus.js"
import MapCore from "./map-core.js"
import Utils from "../utils.js"
import Panels from "../ui/panels.js"

// ─────────────────────────────────────────────────────────────
// Basemaps — base layer (radio) + historical overlay (optional, at
// most one) switching, plus the floating control that drives both.
// ─────────────────────────────────────────────────────────────
const Basemaps = (() => {
	let baseLayerInstances = new Map()
	let currentBaseId = null
	let overlayLayerInstances = new Map()
	let currentOverlayId = null

	function baseLayerFor(def) {
		if (!baseLayerInstances.has(def.id)) {
			baseLayerInstances.set(
				def.id,
				L.tileLayer(def.tileUrl, {
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
					opacity: def.opacity ?? 0.85,
					pane: "overlayPane"
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

		document.documentElement.dataset.theme = def.theme
		EventBus.emit("basemap:baseChanged", def)
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

	function buildBaseControl(container) {
		const row = Utils.el("div", {className: "basemap-panel__row", role: "radiogroup", "aria-label": "Choose base map"})
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
		container.appendChild(row)
		EventBus.on("basemap:baseChanged", layer => {
			buttons.forEach(btn => {
				const isActive = btn.dataset.basemap === layer.id
				btn.classList.toggle("is-active", isActive)
				btn.setAttribute("aria-pressed", String(isActive))
			})
		})
	}

	function buildOverlayControl(container) {
		const row = Utils.el("div", {className: "basemap-panel__row basemap-panel__row--overlay", role: "group", "aria-label": "Toggle historical map overlay"})
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
		container.appendChild(row)
		EventBus.on("basemap:overlayChanged", activeId => {
			buttons.forEach(btn => {
				const isActive = btn.dataset.overlay === activeId
				btn.classList.toggle("is-active", isActive)
				btn.setAttribute("aria-pressed", String(isActive))
			})
		})
	}

	function buildControl() {
		const control = Utils.el("div", {className: "basemap-panel", "aria-label": "Basemap selector"})
		buildBaseControl(control)
		buildOverlayControl(control)
		document.getElementById("map").appendChild(control)
		Panels.isolateFromMap(control)
	}

	function init() {
		buildControl()
		setBase(Config.defaultBaseLayerId ?? Config.baseLayers[0].id)
		if (Config.defaultOverlayLayerId) setOverlay(Config.defaultOverlayLayerId)
	}

	return {init, setBase, setOverlay}
})()

export default Basemaps
