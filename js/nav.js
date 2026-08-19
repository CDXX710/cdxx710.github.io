// Shared nav behavior for index.html, css-cheatsheet.html, and data-sources.html.

// Active nav highlight on scroll
const navScrollSections = document.querySelectorAll("section[id]")
const navScrollLinks = document.querySelectorAll("nav a[href^='#']")

const navScrollObserver = new IntersectionObserver(
	entries => {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				navScrollLinks.forEach(a => a.classList.remove("active"))
				const active = document.querySelector(`nav a[href="#${entry.target.id}"]`)
				if (active) active.classList.add("active")
			}
		})
	},
	{rootMargin: "-20% 0px -70% 0px"}
)

navScrollSections.forEach(s => navScrollObserver.observe(s))

// Mobile nav drawer toggle
const navToggle = document.getElementById("nav-toggle")
const navBackdrop = document.getElementById("nav-backdrop")
const sidebar = document.getElementById("sidebar")

if (navToggle && sidebar) {
	const closeNav = () => {
		document.body.classList.remove("nav-open")
		navToggle.setAttribute("aria-expanded", "false")
	}

	navToggle.addEventListener("click", () => {
		const isOpen = document.body.classList.toggle("nav-open")
		navToggle.setAttribute("aria-expanded", String(isOpen))
	})

	sidebar.querySelectorAll("a").forEach(a => a.addEventListener("click", closeNav))
	if (navBackdrop) navBackdrop.addEventListener("click", closeNav)
	document.addEventListener("keydown", e => {
		if (e.key === "Escape") closeNav()
	})
}
