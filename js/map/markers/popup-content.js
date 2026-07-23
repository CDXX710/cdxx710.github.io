import Utils from "../utils.js"
import Theme from "../state/theme.js"

// ─────────────────────────────────────────────────────────────
// PopupContent — marker popup HTML generation. Pure rendering, no state.
// ─────────────────────────────────────────────────────────────
const PopupContent = (() => {
	function imageBlock(urlIMG, category) {
		if (urlIMG) return Utils.html`<img src="${urlIMG}" alt="Document thumbnail: ${category}" />`
		return Utils.html`
                        <div class="popup__image-empty">
		            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
		            	<rect width="18" height="18" x="3" y="3" rx="2" />
		            	<circle cx="9" cy="9" r="2" />
		            	<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
		            </svg>
	            </div>`
	}
	function authorTypePill(authorType) {
		if (!authorType) return ""
		const color = Theme.creoleColor(authorType)
		return Utils.html`<span class="pill pill--creole-type" style="background:${color}22; color:${color}; border-color:${color}44"> ${Utils.capitalize(authorType)} </span>`
	}
	function creoleRolePill(creole) {
		const label = creole === "using" ? "Written in creole" : creole === "about" ? "About creoles" : ""
		return label ? Utils.html`<span class="pill pill--creole-role">${label}</span>` : ""
	}
	function sourceLink(urlText) {
		if (!urlText) return ""
		return Utils.html`  
                        <a class="popup__source-link" target="_blank" rel="noopener noreferrer" onclick="toggleWindowPopup()">
		            Read source text
	            	<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
	            		<path d="M7 7h10v10" />
	            		<path d="M7 17 17 7" />
	            	</svg>
	            </a>`
	}
	function build(props) {
		const {time, category, creole, authorType, urlIMG, urlText, resume} = props
		const categoryPill = Utils.html`<span class="pill pill--category">${category}</span>`
		return Utils.html`
                        <div class="popup__panels">
		                <div class="popup__left">
		                	<div class="popup__image-wrap">
		                		${imageBlock(urlIMG, category)}
		                		<span class="popup__year-badge">${time}</span>
		                	</div>
		                	<div class="popup__pills">${categoryPill} ${authorTypePill(authorType)} ${creoleRolePill(creole)}</div>
		                </div>
	                	<div class="popup__right">
	                		<div style="height:100%; display:flex; flex-direction:column; justify-content:center">${
							resume
								? `❝ ${resume} ❞`
								: `
                                        <div style="font-size:var(--font-size-xl); color:var(--color-text)">
                                            We're sorry,
                                        </div>
                                        <div style="text-align:right; color:var(--color-text-secondary)">
                                            No resumés are available at the moment..
                                        </div>
                                    `
						}</div>
	                		${sourceLink(urlText)}
	                	</div>
	                </div>`
	}
	return {build}
})()

export default PopupContent
