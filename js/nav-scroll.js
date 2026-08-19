// Active nav highlight on scroll — shared by index.html, css-cheatsheet.html, and data-sources.html.
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
