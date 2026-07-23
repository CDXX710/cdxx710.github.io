// ─────────────────────────────────────────────────────────────
// ArchiveData — the dataset. Pure data, no behaviour.
// ─────────────────────────────────────────────────────────────
const ArchiveData = (() => {
	const LOREM = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla luctus ac lorem et vulputate. In tempus, metus vitae varius mattis, nisl justo imperdiet ligula, interdum placerat justo purus laoreet nisl. Quisque vulputate mauris vel velit rutrum malesuada. Mauris ultricies ligula sit amet odio laoreet consectetur. Sed vitae augue ut odio pharetra ultrices. In hac habitasse platea dictumst."

	const geojson = {
		type: "FeatureCollection",
		features: [
			{type: "Feature", properties: {name: "A Voyage to Dominica", time: 1750, category: "poem", creole: "using", authorType: "others", urlIMG: "../img/book (1).jfif", resume: LOREM}, geometry: {type: "Point", coordinates: [-61.409993, 15.523156]}},
			{type: "Feature", properties: {name: "British Colonial Report", time: 1816, category: "report", creole: "about", authorType: "admin", urlIMG: "../img/book (1).jfif", urlText: true, resume: LOREM}, geometry: {type: "Point", coordinates: [-61.316598, 15.37628]}},
			{type: "Feature", properties: {name: "Caribbean Merchant Letter", time: 1691, category: "letter", creole: "using", authorType: "poet", urlIMG: "../img/book (2).jfif", urlText: null, resume: null}, geometry: {type: "Point", coordinates: [-61.346091, 15.544468]}},
			{type: "Feature", properties: {name: "Plantation Ledger", time: 1763, category: "others", creole: "about", authorType: null, urlIMG: "../img/book (2).jfif", urlText: null, resume: null}, geometry: {type: "Point", coordinates: [-61.76047, 16.285686]}},
			{type: "Feature", properties: {name: "Early Missionary Notes", time: 1847, category: "notes", creole: "about", authorType: "merchant", urlIMG: "../img/book (3).jfif", urlText: true, resume: LOREM}, geometry: {type: "Point", coordinates: [-61.387352, 16.315212]}},
			{type: "Feature", properties: {name: "Creole Verses", time: 1717, category: "poem", creole: null, authorType: "poet", urlIMG: "../img/book (3).jfif", urlText: true, resume: LOREM}, geometry: {type: "Point", coordinates: [-61.611308, 16.117324]}},
			{type: "Feature", properties: {name: "Holy Scriptures Translation", time: 1648, category: "bible", creole: "about", authorType: "others", urlIMG: "../img/book (4).jfif", urlText: true, resume: LOREM}, geometry: {type: "Point", coordinates: [-61.145557, 14.819471]}},
			{type: "Feature", properties: {name: "Island Folk Ballad", time: 1689, category: "roman", creole: null, authorType: "clergy", urlIMG: "../img/book (4).jfif", urlText: true, resume: LOREM}, geometry: {type: "Point", coordinates: [-60.964977, 14.693279]}},
			{type: "Feature", properties: {name: "Zanzibar Correspondence", time: 1777, category: "letter", creole: "using", authorType: null, urlIMG: "../img/book (5).jfif", urlText: true, resume: LOREM}, geometry: {type: "Point", coordinates: [-60.885014, 14.484105]}},
			{type: "Feature", properties: {name: "Military Dispatch from Roseau", time: 1795, category: "report", creole: null, authorType: "military", urlIMG: "../img/book (5).jfif", urlText: true, resume: LOREM}, geometry: {type: "Point", coordinates: [-61.392, 15.304]}},
			{type: "Feature", properties: {name: "Governor's Private Correspondence", time: 1802, category: "letter", creole: "about", authorType: "admin", urlIMG: "../img/book (6).jfif", urlText: null, resume: null}, geometry: {type: "Point", coordinates: [-61.371, 15.301]}},
			{type: "Feature", properties: {name: "Merchant's Harbour Journal", time: 1734, category: "notes", creole: "using", authorType: "merchant", urlIMG: "../img/book (6).jfif", urlText: null, resume: null}, geometry: {type: "Point", coordinates: [-61.545, 16.241]}},
			{type: "Feature", properties: {name: "Songs from the Windward Coast", time: 1821, category: "poem", creole: "using", authorType: "writer", urlIMG: "../img/book (7).jfif", urlText: true, resume: LOREM}, geometry: {type: "Point", coordinates: [-61.005, 14.017]}},
			{type: "Feature", properties: {name: "Catechism for Island Communities", time: 1709, category: "bible", creole: "using", authorType: "clergy", urlIMG: "../img/book (7).jfif", urlText: true, resume: LOREM}, geometry: {type: "Point", coordinates: [-61.118, 14.599]}},
			{type: "Feature", properties: {name: "Chronicle of the Sugar Estates", time: 1766, category: "others", creole: null, authorType: "writer", urlIMG: "../img/book (8).jfif", urlText: null, resume: null}, geometry: {type: "Point", coordinates: [-61.476, 16.202]}},
			{type: "Feature", properties: {name: "A Romance of Saint Lucia", time: 1843, category: "roman", creole: "about", authorType: "writer", urlIMG: "../img/book (8).jfif", urlText: true, resume: LOREM}, geometry: {type: "Point", coordinates: [-60.984, 13.909]}},
			{type: "Feature", properties: {name: "Captain's Field Notebook", time: 1782, category: "notes", creole: null, authorType: "military", urlIMG: "../img/book (9).jfif", urlText: null, resume: null}, geometry: {type: "Point", coordinates: [-61.662, 15.972]}},
			{type: "Feature", properties: {name: "Poems for the Caribbean Colonies", time: 1756, category: "poem", creole: "about", authorType: "others", urlIMG: "../img/book (9).jfif", urlText: true, resume: LOREM}, geometry: {type: "Point", coordinates: [-61.323, 15.428]}},
			{type: "Feature", properties: {name: "Registry of Colonial Trade", time: 1819, category: "report", creole: "using", authorType: "admin", urlIMG: "../img/book (10).jfif", urlText: true, resume: LOREM}, geometry: {type: "Point", coordinates: [-61.514, 16.071]}},
			{type: "Feature", properties: {name: "Letter from a Parish Priest", time: 1698, category: "letter", creole: null, authorType: "clergy", urlIMG: "../img/book (10).jfif", urlText: null, resume: null}, geometry: {type: "Point", coordinates: [-61.175, 14.738]}},
			{type: "Feature", properties: {name: "Narrative of the Lesser Antilles", time: 1837, category: "roman", creole: "using", authorType: "writer", urlIMG: "../img/book (11).jfif", urlText: null, resume: null}, geometry: {type: "Point", coordinates: [-61.259, 15.614]}},
			{type: "Feature", properties: {name: "Survey of Indigenous Languages", time: 1771, category: "others", creole: "about", authorType: "others", urlIMG: "../img/book (11).jfif", urlText: true, resume: LOREM}, geometry: {type: "Point", coordinates: [-61.421, 15.597]}},
			{type: "Feature", properties: {name: "Account Book of a Cocoa Trader", time: 1811, category: "notes", creole: "about", authorType: "merchant", urlIMG: "../img/book (12).jfif", urlText: null, resume: null}, geometry: {type: "Point", coordinates: [-61.598, 15.998]}},
			{type: "Feature", properties: {name: "Meditations in Creole Verse", time: 1861, category: "poem", creole: "using", authorType: "poet", urlIMG: "../img/book (12).jfif", urlText: true, resume: LOREM}, geometry: {type: "Point", coordinates: [-61.028, 14.505]}},
			{type: "Feature", properties: {name: "Naval Orders for the Leeward Islands", time: 1805, category: "report", creole: "about", authorType: "military", urlIMG: null, urlText: true, resume: LOREM}, geometry: {type: "Point", coordinates: [-61.702, 16.335]}}
		]
	}
	return {geojson, features: geojson.features}
})()

export default ArchiveData
