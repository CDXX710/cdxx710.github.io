-   [x] **Popup/marker centering needs refinement.** Popups are not consistently centered on their associated markers.

-   [ ] **No state serialization.** The application does not persist or encode state via URL parameters, `history.pushState`, or `localStorage`. Nothing is bookmarkable, shareable, or resumable—not even the current filters and selection. This is the highest-leverage infrastructure improvement and a prerequisite for future Comparison and Story features.

-   [x] **Poor discoverability of the selection tools.** Four drawing tools × two object-selection modes × four boolean combine modes create a GIS-level interaction surface with little onboarding. Native `title` tooltips are insufficient, and there is no empty-state guidance to help users discover that selections can be combined using boolean operations.

-   [x] **No feedback when markers disappear.** Applying filters or changing the year range causes markers to vanish without explanation. Users should receive clear feedback (for example, "12 records hidden by filters") so changes in the dataset are understandable.

-   [x] **Ambiguous record counts between panels.** The Results panel and Analytics panel display different metrics (`SelectionState.size()` vs. `recordsInView`) that are distinguished only by small label changes ("Selection" vs. "Visible"). This ambiguity is likely to become more problematic once Comparison introduces a second parallel selection.

-   [x] **Store an explicit `island` property on each archive record.** Rather than deriving the island at runtime through `GeoIndex` point-in-polygon lookups, historians should author records with an explicit `"island"` field. `GeoIndex` can then serve as a fallback and validation layer (e.g. flagging records whose stored island disagrees with the computed geometry) instead of being the sole source of truth. This removes an unnecessary runtime dependency on boundary data and makes island-based comparisons and Story `highlightedRegions` straightforward to implement.

-   [x] **Introduce scalable marker rendering when needed.** Not a day-one requirement, but once datasets reach roughly **5,000–10,000 markers**, replace one `L.marker` per record with `Leaflet.markercluster` or Canvas-based rendering (`preferCanvas: true`) in both single-map and dual-map modes to maintain performance.

-   [ ] **Clicking a category in RESEARCH SUMMARY toggle all others of same type off**
