// ─────────────────────────────────────────────────────────────
// EventBus — the only channel modules use to talk to each other.
// ─────────────────────────────────────────────────────────────
const EventBus = (() => {
	const listeners = new Map()
	function on(event, handler) {
		if (!listeners.has(event)) listeners.set(event, new Set())
		listeners.get(event).add(handler)
		return () => listeners.get(event).delete(handler)
	}
	function emit(event, payload) {
		listeners.get(event)?.forEach(handler => handler(payload))
	}
	return {on, emit}
})()

export default EventBus
