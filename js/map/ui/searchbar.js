import Utils from "../utils.js"
import Config from "../config.js"
import ArchiveData from "../data/archive-data.js"
import SelectionState from "../state/selection-state.js"
import EventBus from "../event-bus.js"

// ─────────────────────────────────────────────────────────────
// Searchbar — the search input: matching, debouncing, and the
// open/close animation state machine for the collapsed search icon.
//
// The icon itself (magnifying glass morphing into a text caret) is
// drawn as an SVG path/line redrawn every frame from the bar's real
// pixel size, so the animation still tracks the panel's CSS-driven
// (rem/vw) dimensions instead of a fixed pixel geometry.
// ─────────────────────────────────────────────────────────────
const Searchbar = (() => {
	function isolateFromMap(el) {
		L.DomEvent.disableScrollPropagation(el)
		L.DomEvent.disableClickPropagation(el)
	}
	function matchesQuery(feature, query) {
		const {name, time, category, creole, authorType} = feature.properties
		const haystack = [name, time, category, creole, authorType].filter(Boolean).join(" ").toLowerCase()
		const escaped = query.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
		const regex = new RegExp(`\\b${escaped}`, "i")
		return regex.test(haystack)
	}
	function runSearch(rawQuery) {
		const query = rawQuery.trim().toLowerCase()
		EventBus.emit("search:queryChanged", Boolean(query))
		if (!query) {
			SelectionState.clear()
			return
		}
		const matchingIndices = ArchiveData.features.map((feature, index) => (matchesQuery(feature, query) ? index : -1)).filter(index => index !== -1)
		const previousMode = SelectionState.getMode()
		SelectionState.setMode("new")
		SelectionState.applyHits(matchingIndices)
		SelectionState.setMode(previousMode)
	}

	function clamp(value, min, max) {
		return Math.min(Math.max(value, min), max)
	}

	function easeInOutCubic(t) {
		return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
	}

	function init() {
		const bar = document.getElementById("searchbar-panel")
		const trigger = document.getElementById("searchbar-panel__trigger")
		const input = document.getElementById("searchbar-panel__field")
		const clearBtn = document.getElementById("searchbar-panel__clear-btn")
		const vector = document.getElementById("searchbar-panel__vector")
		const outlinePath = document.getElementById("searchbar-panel__outline")
		const handleLine = document.getElementById("searchbar-panel__handle")
		const measure = document.getElementById("searchbar-panel__measure")
		isolateFromMap(bar)

		let open = false,
			animating = false,
			pendingOpen = null,
			animationFrame = null,
			progress = 0,
			collapsedWidth = bar.getBoundingClientRect().width || 1,
			expandedWidth = collapsedWidth,
			height = bar.getBoundingClientRect().height || 1,
			caretX = 0

		const CENTER_RATIO = 0.5
		const LENS_RADIUS_RATIO = 0.31
		const HANDLE_START_RATIO = 0.19
		const HANDLE_LENGTH_RATIO = 0.46
		const CARET_TOP_RATIO = 0.27
		const CARET_BOTTOM_RATIO = 0.73
		const OUTLINE_INSET_RATIO = 0.03

		// The expand/collapse timeline is split into two sequential (non-overlapping)
		// phases instead of animating handle + lens simultaneously:
		//   - handle phase: progress [0, PHASE_SPLIT)  — the handle rotates/detaches and
		//     travels to its caret position; the lens stays at collapsedWidth.
		//   - lens phase:   progress [PHASE_SPLIT, 1]   — the lens resizes to expandedWidth;
		//     the handle stays fixed at its fully-detached caret position.
		// Because `progress` runs 0→1 while opening and 1→0 while closing, reusing this
		// same mapping for both directions naturally gives "handle then lens" on expand
		// and "lens then handle" (reversed) on collapse.
		const PHASE_SPLIT = 0.5
		const HANDLE_DETACH_RATIO = 0.55

		function measureBar() {
			const rect = bar.getBoundingClientRect()
			height = rect.height || 1
			if (!open) collapsedWidth = rect.width || collapsedWidth
			vector.setAttribute("viewBox", `0 0 ${Math.max(rect.width, collapsedWidth)} ${height}`)
		}

		function buildOutlinePath(width) {
			const inset = height * OUTLINE_INSET_RATIO
			const h = height - inset * 2
			const r = h / 2
			const x = inset
			const y = inset
			const bottom = y + h
			const leftCap = x + r
			const innerWidth = Math.max(width - inset * 2, h)
			const right = x + innerWidth
			const rightCap = right - r
			const topR = y + r
			const bottomR = bottom - r
			const arc = `${r} ${r} 0 0 1 `
			return `M${leftCap} ${y}H${rightCap}A${arc}${right} ${topR}V${bottomR}A${arc}${rightCap} ${bottom}H${leftCap}A${arc}${x} ${bottomR}V${topR}A${arc}${leftCap} ${y}Z`
		}

		function drawAttachedHandle(angleDeg) {
			const cx = height * CENTER_RATIO
			const cy = height * CENTER_RATIO
			const lensRadius = height * LENS_RADIUS_RATIO
			const startRadius = lensRadius + height * HANDLE_START_RATIO
			const endRadius = startRadius + height * HANDLE_LENGTH_RATIO
			const radians = (angleDeg * Math.PI) / 180
			handleLine.setAttribute("x1", (cx + startRadius * Math.cos(radians)).toFixed(2))
			handleLine.setAttribute("y1", (cy + startRadius * Math.sin(radians)).toFixed(2))
			handleLine.setAttribute("x2", (cx + endRadius * Math.cos(radians)).toFixed(2))
			handleLine.setAttribute("y2", (cy + endRadius * Math.sin(radians)).toFixed(2))
		}

		function drawDetachedHandle(detachProgress, targetCaretX) {
			const cx = height * CENTER_RATIO
			const cy = height * CENTER_RATIO
			const lensRadius = height * LENS_RADIUS_RATIO
			const startTop = cy + lensRadius + height * HANDLE_START_RATIO
			const startBottom = startTop + height * HANDLE_LENGTH_RATIO
			const caretTop = height * CARET_TOP_RATIO
			const caretBottom = height * CARET_BOTTOM_RATIO
			const x = cx + (targetCaretX - cx) * detachProgress
			const y1 = startTop + (caretTop - startTop) * detachProgress
			const y2 = startBottom + (caretBottom - startBottom) * detachProgress
			handleLine.setAttribute("x1", x.toFixed(2))
			handleLine.setAttribute("x2", x.toFixed(2))
			handleLine.setAttribute("y1", y1.toFixed(2))
			handleLine.setAttribute("y2", y2.toFixed(2))
		}

		// Keeps the hidden measurer's text box byte-for-byte in sync with the real
		// input's font metrics and left padding, read live off the input itself.
		// This is the only place these values are read: nothing here is duplicated
		// or hand-tuned, so the measurer's box can never drift from the real one.
		function syncMeasure() {
			const style = getComputedStyle(input)
			measure.style.fontFamily = style.fontFamily
			measure.style.fontSize = style.fontSize
			measure.style.fontWeight = style.fontWeight
			measure.style.fontStyle = style.fontStyle
			measure.style.fontKerning = style.fontKerning
			measure.style.fontVariantLigatures = style.fontVariantLigatures
			measure.style.letterSpacing = style.letterSpacing
			measure.style.wordSpacing = style.wordSpacing
			measure.style.paddingLeft = style.paddingLeft
			return parseFloat(style.paddingRight) || 0
		}

		function currentCaretX(width) {
			const fieldRight = syncMeasure()
			const value = input.value.replace(/ /g, "\u00a0")
			const caretIndex = clamp(input.selectionStart || 0, 0, value.length)
			// Measure the rendered width of the text up to the caret directly,
			// rather than placing an empty marker element in the text flow and
			// reading its offsetLeft. An empty inline element at the end of a
			// long text run in a `white-space: pre` box is prone to sub-pixel
			// layout drift that compounds with string length; measuring the
			// substring's own bounding box avoids that entirely. `measure`
			// already has the live padding-left applied (via syncMeasure), so
			// its rect width already accounts for that padding.
			measure.textContent = value.slice(0, caretIndex)
			const textWidth = measure.getBoundingClientRect().width
			return clamp(textWidth - input.scrollLeft, parseFloat(measure.style.paddingLeft) || 0, width - fieldRight)
		}

		function setBlinking(active) {
			handleLine.classList.toggle("is-blinking", active)
		}

		function drawFrame(width, mode, valueA, valueB) {
			outlinePath.setAttribute("d", buildOutlinePath(width))
			const eased = easeInOutCubic(clamp(progress, 0, 1))
			const pad = 20 * (1 - eased)
			vector.setAttribute("viewBox", `${-pad} ${-pad} ${width + pad * 3} ${height + pad * 3}`)
			if (mode === "attached") {
				drawAttachedHandle(valueA)
			} else {
				drawDetachedHandle(valueA, valueB)
			}
		}

		function renderCollapsed() {
			progress = 0
			measureBar()
			drawFrame(collapsedWidth, "attached", 45, 0)
		}

		function renderExpandedStatic() {
			progress = 1
			expandedWidth = bar.getBoundingClientRect().width
			caretX = currentCaretX(expandedWidth)
			drawFrame(expandedWidth, "detached", 1, caretX)
			if (document.activeElement === input) setBlinking(true)
		}

		// Renders one frame of the expand/collapse transition. Mirrors
		// the CSS `width` transition on .searchbar-panel.is-open so the
		// glass outline / handle stay in sync with the panel's own
		// width animation instead of running on a separate timeline.
		function renderAtProgress(p, targetCaretX) {
			progress = p
			expandedWidth = bar.getBoundingClientRect().width
			const clampedP = clamp(p, 0, 1)
			if (clampedP < PHASE_SPLIT) {
				// Handle phase: lens size is untouched until the handle has fully
				// arrived at (or, when collapsing, fully left) the caret position.
				const handleT = clampedP / PHASE_SPLIT
				if (handleT < HANDLE_DETACH_RATIO) {
					drawFrame(collapsedWidth, "attached", 45 + 45 * easeInOutCubic(handleT / HANDLE_DETACH_RATIO), 0)
				} else {
					drawFrame(collapsedWidth, "detached", easeInOutCubic((handleT - HANDLE_DETACH_RATIO) / (1 - HANDLE_DETACH_RATIO)), targetCaretX)
				}
			} else {
				// Lens phase: handle stays locked at its detached caret position while
				// the lens itself resizes between collapsedWidth and expandedWidth.
				const lensT = (clampedP - PHASE_SPLIT) / (1 - PHASE_SPLIT)
				const width = collapsedWidth + (expandedWidth - collapsedWidth) * easeInOutCubic(lensT)
				drawFrame(width, "detached", 1, targetCaretX)
			}
			input.style.opacity = String(clamp(clampedP < PHASE_SPLIT ? 0 : (clampedP - PHASE_SPLIT) / (1 - PHASE_SPLIT), 0, 1))
		}

		function animateIcon(target) {
			if (animationFrame) cancelAnimationFrame(animationFrame)
			const from = progress
			const targetCaretX = target === 1 ? parseFloat(getComputedStyle(input).paddingLeft) || 0 : caretX || currentCaretX(collapsedWidth)
			setBlinking(false)
			const start = performance.now()
			const duration = Math.max(160, Math.abs(target - from) * Config.searchbarAnimationMs * 2)
			function step(now) {
				const t = Math.min((now - start) / duration, 1)
				renderAtProgress(from + (target - from) * t, targetCaretX)
				if (t < 1) {
					animationFrame = requestAnimationFrame(step)
					return
				}
				animationFrame = null
				if (target === 1) {
					renderExpandedStatic()
				} else {
					renderCollapsed()
				}
			}
			animationFrame = requestAnimationFrame(step)
		}

		const searchDebounced = Utils.debounce(runSearch, Config.search.debounceMs)

		function setOpen(next) {
			if (next === open) {
				pendingOpen = null
				return
			}
			if (animating) {
				pendingOpen = next
				return
			}
			animating = true
			open = next
			bar.classList.toggle("is-open", open)
			trigger.setAttribute("aria-expanded", String(open))
			trigger.setAttribute("aria-label", open ? "Search field" : "Open search")
			animateIcon(open ? 1 : 0)
			if (open) {
				setTimeout(() => input.focus())
			} else {
				input.blur()
				input.value = ""
				clearBtn.classList.remove("is-visible")
				runSearch("")
			}
			setTimeout(() => {
				animating = false
				if (pendingOpen !== null && pendingOpen !== open) {
					const queued = pendingOpen
					pendingOpen = null
					setOpen(queued)
				} else {
					pendingOpen = null
				}
			}, Config.searchbarAnimationMs)
		}

		trigger.addEventListener("click", () => {
			if (open && !animating) {
				input.focus()
				return
			}
			setOpen(true)
		})
		bar.addEventListener("mousedown", e => {
			if ((e.target === bar || e.target === trigger) && input.value.length === 0 && SelectionState.size() === 0) setOpen(false)
		})
		input.addEventListener("focus", () => {
			if (open && !animating) {
				renderExpandedStatic()
				setBlinking(true)
			}
		})
		input.addEventListener("blur", () => {
			setBlinking(false)
			setTimeout(() => {
				if (open && !bar.contains(document.activeElement) && SelectionState.size() === 0) setOpen(false)
			}, 0)
		})
		input.addEventListener("input", () => {
			clearBtn.classList.toggle("is-visible", input.value.length > 0)
			searchDebounced(input.value)
		})
		;["input", "keyup", "click", "select", "scroll"].forEach(eventName => {
			input.addEventListener(eventName, () => {
				if (!open || animating) return
				renderExpandedStatic()
			})
		})
		clearBtn.addEventListener("click", () => {
			input.value = ""
			clearBtn.classList.remove("is-visible")
			input.focus()
			runSearch("")
		})
		document.addEventListener("keydown", e => {
			if (e.key !== "Escape" || !open) return
			if (input.value.length > 0) {
				input.value = ""
				clearBtn.classList.remove("is-visible")
				runSearch("")
				input.focus()
			} else {
				setOpen(false)
			}
		})
		window.addEventListener("resize", () => {
			if (!open && !animating) renderCollapsed()
		})

		renderCollapsed()
	}
	return {init}
})()

export default Searchbar
