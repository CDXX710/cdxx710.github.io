// ─────────────────────────────────────────────────────────────
// SelectionAlgebra — pure set-combination rules. No state, no DOM.
// ─────────────────────────────────────────────────────────────
const SelectionAlgebra = (() => {
	const combinators = {
		new: (existing, hits) => new Set(hits),
		add: (existing, hits) => new Set([...existing, ...hits]),
		subtract: (existing, hits) => new Set([...existing].filter(i => !hits.has(i))),
		intersect: (existing, hits) => new Set([...existing].filter(i => hits.has(i)))
	}
	function combine(existing, hitIndices, mode) {
		const hits = new Set(hitIndices)
		const combinator = combinators[mode] ?? combinators.new
		return combinator(existing, hits)
	}
	return {combine}
})()

export default SelectionAlgebra
