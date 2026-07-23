import Utils from "../utils.js"

// ─────────────────────────────────────────────────────────────
// Shapes — SVG generation for marker icons and legend swatches.
// ─────────────────────────────────────────────────────────────
const Shapes = (() => {
	const split = "#fff"
	const splitWidth = 1
	const markerFragments = {
		about: (fill, stroke) => {
			const inset = splitWidth
			const cx = 15,
				cy = 19
			const scale = (px, py) => {
				const dx = px - cx,
					dy = py - cy
				const len = Math.hypot(dx, dy)
				const f = (len - inset) / len
				return `${cx + dx * f},${cy + dy * f}`
			}
			const insetPoints = ["15,3", "28,27", "2,27"]
				.map(p => {
					const [x, y] = p.split(",").map(Number)
					return scale(x, y)
				})
				.join(" ")
			return {
				size: 30,
				svg: Utils.html`
				<polygon points="${insetPoints}" fill="${fill}" />
				<polygon points="15,3 28,27 2,27" fill="none" stroke="${split}" stroke-width="6" stroke-linejoin="round" />
				<polygon points="15,3 28,27 2,27" fill="none" stroke="${stroke}" stroke-width="4" stroke-linejoin="round" />
			`
			}
		},
		using: (fill, stroke) => ({
			size: 24,
			svg: Utils.html`
			<rect x="0" y="0" width="24" height="24" fill="${fill}" rx="1" />
			<rect x="0" y="0" width="24" height="24" fill="none" stroke="${split}" stroke-width="6" rx="1" />
			<rect x="0" y="0" width="24" height="24" fill="none" stroke="${stroke}" stroke-width="4" rx="1" />
		`
		}),
		unknown: (fill, stroke) => ({
			size: 24,
			svg: Utils.html`
			<circle cx="12" cy="12" r="12" fill="${fill}" />
			<circle cx="12" cy="12" r="12" fill="none" stroke="${split}" stroke-width="6" />
			<circle cx="12" cy="12" r="12" fill="none" stroke="${stroke}" stroke-width="4" />
		`
		})
	}
	const legendFragments = {
		using: `<rect class="shape-fill" x="1.5" y="1.5" width="11" height="11" stroke-width="1.5" rx="1" />`,
		about: `<polygon class="shape-fill" points="7,1 13,13 1,13" stroke-width="1.5" stroke-linejoin="round" />`,
		unknown: `<circle class="shape-fill" cx="7" cy="7" r="5" stroke-width="1.5" />`,
		ring: `<circle class="shape-fill shape-fill--ring" cx="7" cy="7" r="5" stroke-width="3" />`
	}
	function markerSvg(creoleRole, fillColor, ringColor) {
		const {size, svg} = (markerFragments[creoleRole] ?? markerFragments.unknown)(fillColor, ringColor)
		const glow = `filter:drop-shadow(0 0 0.25rem ${ringColor})`
		return Utils.html`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow:visible; ${glow};">${svg}</svg>`
	}
	function legendSvg(kind) {
		return Utils.html`<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">${legendFragments[kind] ?? legendFragments.unknown}</svg>`
	}
	return {markerSvg, legendSvg}
})()

export default Shapes
