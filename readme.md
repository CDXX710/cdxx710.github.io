# To Do
*  [ ] **Enhance basemaps**
> CARTO Dark/Light always present in background.
>> World Atlas and Piccole on top
>>> Day/Night "XD Like" selector for dark/light
*  [ ] **Add geospatial boundaries**
>Overlay:
>>Colonial borders by year
>>
>>Parish boundaries
>>
>>Plantation boundaries
>>
>>Indigenous territories
*  [ ] **Add summary analytics**
>*A small analytics panel could show:*
>>Number of records in view
>>
>>Top locations
>>
>>Trends over time
>>
>>Categories represented
*  [ ] **Add export options**
>Researchers love:
>>Exporting filtered datasets
>>
>>Exporting map screenshots
>>
>>Exporting metadata summaries
*  [ ] **Enable comparisons**
>Let users compare:
>>Two time periods
>>
>>Two islands
>>
>>Two categories
*  [ ] **Story mode / guided narratives**
>Let users click through curated historical stories:
>>“The rise of sugar plantations”
>>
>>“Slave rebellions across the Caribbean”
>>
>>“Migration patterns after emancipation”
*   [ ] **Multi files refactor**
<code>
/
├── index.html                      # Markup + <link>/<script type="module"> wiring only
│
├── js/
│   ├── data/
│   │   ├── archive-data.js         # Feature dataset (or fetched JSON)
│   │   └── visualizer-content.html # Placeholder document content (or .js template)
│   │
│   ├── core/
│   │   ├── utils.js                # htmlTag, capitalize, readCssVar, el,
│   │   │                           # isolateFromMap, compareNullsLast
│   │   ├── event-bus.js
│   │   └── theme.js
│   │
│   ├── state/
│   │   ├── filter-state.js
│   │   └── selection-state.js      # Pure selection-algebra module, unit-testable
│   │
│   ├── map/
│   │   ├── map-core.js
│   │   ├── marker-icons.js         # Single geometry source for markers + legend
│   │   ├── markers.js
│   │   └── popup-content.js
│   │
│   ├── geometry/
│   │   ├── geometry.js             # Pure math, framework-agnostic
│   │   └── draw-overlay.js
│   │
│   ├── ui/
│   │   ├── collapsible-panel.js    # Shared by legend + selection results
│   │   ├── legend.js
│   │   ├── selection-toolbar.js
│   │   ├── selection-results.js
│   │   ├── custom-select.js
│   │   ├── searchbar.js
│   │   ├── visualizer-modal.js
│   │   └── time-slider.js
│   │
│   └── app.js                      # bootstrap() — dependency-ordered init;
│                                   # only file that touches all modules
│
├── css/
│   ├── shared.css
│   ├── index.css
│   ├── cheatsheet.css
│   └── map.css
│
├── web/
│   ├── cheatsheet.html
│   └── map.html
│
└── img/
</code>
