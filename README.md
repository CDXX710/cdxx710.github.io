# cdxx710.github.io

Personal GitHub Pages site: a small link index plus a data-visualisation prototype.

**Live site:** https://cdxx710.github.io

## Structure

- `index.html` — landing page, a curated index of links (prototypes, resources, reading), grouped into sections and rendered as cards.
- `web/map.html` — **Caribbean Archives**, a Leaflet-based data visualisation prototype for exploring archival records (documents, authors, roles) across the Caribbean, with filtering, search, selection, a time slider, and export.
- `web/map-audit.html` — a full technical/architecture audit of the map prototype: stack, design decisions, current limitations, and a roadmap.
- `web/css-cheatsheet.html` — a reference sheet of named fonts and colours.
- `web/data-sources.html` — a GIS open-data cheatsheet (pros, cons, licensing).
- `css/` — stylesheets, with `css/map/` holding the map UI's per-panel styles.
- `js/` — vanilla ES modules, with `js/map/` holding the map app's logic (state, map core, markers, UI panels) and `js/vendor/` holding third-party libraries (noUiSlider, TopoJSON).
- `img/` — flags, marker icons, thumbnails, and pre-rendered map tiles used by the prototype.

## Stack

No build step or framework — plain HTML/CSS and vanilla JavaScript (ES modules), using [Leaflet](https://leafletjs.com/) for mapping. See `web/map-audit.html` for a detailed breakdown of the map app's architecture and design decisions.

## Running locally

Since the map app loads modules and local tile/data files, serve the repo over HTTP rather than opening files directly:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Notes

- `robots.txt` disallows all crawling — this is a personal/reference site, not intended for search indexing.
