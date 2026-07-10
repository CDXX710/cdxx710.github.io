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
/src
├──/data
│   ├── archive-data.js            feature dataset (or fetched JSON)
│   └── visualizer-content.html    (or .js template) — placeholder document content
├──/core
│   ├── utils.js                   html tag, capitalize, readCssVar, el, isolateFromMap, ompareNullsLast
│   ├── event-bus.js
│   └── theme.js
├──/state
│   ├── filter-state.js
│   └── selection-state.js         pure selection-algebra submodule, unit-testable
├──/map
│   ├── map-core.js
│   ├── marker-icons.js            single shape-geometry source, used by markers + legend
│   ├── markers.js
│   └── popup-content.js
├──/geometry
│   ├── geometry.js                pure math, framework-agnostic
│   └── draw-overlay.js
├──/ui
│   ├── collapsible-panel.js       shared by legend + selection-results
│   ├── legend.js
│   ├── selection-toolbar.js
│   ├── selection-results.js
│   ├── custom-select.js
│   ├── searchbar.js
│   ├── visualizer-modal.js
│   └── time-slider.js
├── app.js                         bootstrap() — dependency-ordered init, onlfile that ouches all modules
├──/styles
│   ├── shared.css
│   ├── index.css
│   ├── cheatsheet.css
│   └── map.css
├── index.html                     markup + ``<link>/<script type="module">`` wiring only
</code>
