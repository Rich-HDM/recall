# Map data sources

Both files are plain JSON with unprojected lon/lat coordinates (WGS84). Built 2026-11-04 with pure-Python
scripts (Douglas-Peucker simplification, spherical areas, edge-based dissolve); no GIS libraries.

## uk.json (~465 KB)

### counties (93 entries: England 47, Wales 8, Northern Ireland 6, Scotland 32)
- **England, Wales, Northern Ireland**: `uk-ceremonial-counties.geojson` from the GitHub repo
  `evansd/uk-ceremonial-counties` (fetched via raw.githubusercontent.com, commit 2b63603). Per its README it is
  built from ONS parliamentary ward boundaries for Great Britain (Open Government Licence v3, contains OS data
  (c) Crown copyright) and OpenStreetMap county data for Northern Ireland (ODbL, (c) OpenStreetMap contributors).
  The file holds the 47 English ceremonial counties with the City of London included inside Greater London
  (so "City of London" is not a separate entry), the 8 Welsh preserved counties (Gwynedd, Clwyd, Powys, Dyfed,
  West/Mid/South Glamorgan, Gwent) and the 6 traditional NI counties. Its Scotland is the 12 pre-1996 regions,
  which were NOT used.
- **Scotland**: the 32 council areas from Natural Earth `ne_10m_admin_1_states_provinces` (public domain), the
  accepted fallback (lieutenancy areas are not available from any reachable source). Names normalised:
  "North Ayshire" -> North Ayrshire, "Perthshire and Kinross" -> Perth and Kinross, "Eilean Siar" ->
  Na h-Eileanan Siar, "Orkney" -> Orkney Islands, Edinburgh/Glasgow/Aberdeen/Dundee -> "City of Edinburgh",
  "Glasgow City", "Aberdeen City", "Dundee City".
- **Join between the two sources**: NE's Anglo-Scottish border deviates by up to ~2.5 km from the ONS one, so
  the ONS border polyline (the shared edges of Northumberland/Cumbria with Scottish Borders/Dumfries and
  Galloway in the evansd file, 154 km, 146 vertices) was transplanted onto the NE Scottish Borders and
  Dumfries and Galloway polygons. The join is seamless; the only visible artefact is a sub-kilometre kink on
  the coast at Berwick and on the Solway where the two coastlines meet.
- Other name changes: "Durham" -> "County Durham", "Bristol" -> "City of Bristol".
- Processing: outer rings only (no holes exist), rings under 0.8 km2 dropped, Douglas-Peucker at 0.003 deg,
  coordinates rounded to 4 decimals, rings sorted largest first. Isle of Wight, Anglesey, Orkney, Shetland,
  the Hebrides, Arran, Skye, Scilly (in Cornwall), Lundy (Devon), Holy Island etc. are kept.
- Not included: Isle of Man and the Channel Islands (Crown dependencies, not counties).

### places (124: rank 1 = 13, rank 2 = 72, rank 3 = 39)
Coordinates from Natural Earth `ne_10m_populated_places` where the town is present (57 UK places), otherwise
hand-entered to 2 decimals. Rank 2 holds every county town and cathedral city, which is why the total is above
the ~100 target. Rank 3 was trimmed to the best-known towns.

### rivers (52)
- From Natural Earth (public domain), unchanged: Thames, Severn, Trent, Ness (with Loch Ness), Shannon
  (`ne_10m_rivers_lake_centerlines`); Great Ouse, Ouse (Yorkshire) (NE's "Swale" feature, which runs
  Swale -> Ouse to Trent Falls), Tay, Tweed, Wye (`ne_10m_rivers_europe`). Thames and Severn estuaries were
  extended by a few hand-entered points. Natural Earth has no other named British rivers.
- The other 42 rivers are **hybrid**: a dense hand-drawn backbone (25-60 waypoints through the towns and
  villages on the river, Chaikin-smoothed, 2 iterations) onto which real OpenStreetMap river centrelines are
  substituted wherever they follow it. The OSM centrelines come from `data/v1/network.geojson` in the GitHub
  repo `mchittineni/uk-river-flow` (OSM `waterway=river` ways via Overpass, simplified to ~90 m, named ways
  of 3 km or longer only) - (c) OpenStreetMap contributors, ODbL 1.0. Because that file dropped short ways,
  each river is a series of OSM chains with gaps; the gaps, the headwaters and the estuaries are filled from
  the smoothed backbone with offset-blended joins. Share of each river's length that is real OSM geometry:
  Tyne (South Tyne + Tyne, with a North Tyne branch) 75%/40%, Tees 70%, Wear 95%, Mersey 78%, Dee 53%,
  Nene 33%, Welland 48%, Witham 66%, Exe 30%, Tamar 38%, Taff 39%, Usk 70%, Towy 79%, Clyde 69%, Forth 15%,
  Spey 88%, Dee (Aberdeenshire) 93%, Don 85%, Avon (Bristol) 36%, Avon (Warwickshire) 45%, Eden (Cumbria) 96%,
  Ribble 43%, Aire 66%, Derwent (Derbyshire) 17%, Derwent (Yorkshire) 64%, Teme 38%, Cam 36%, Itchen 9%,
  Test 82%, Frome (Dorset) 53%, Wensum 76%, Yare 47%, Waveney 13%, Lune 73%, Kent (Cumbria) 23%, Conwy 50%.
- **Backbone only (no OSM data in that file)**: Humber, Medway, Great Stour, Bann (Upper and Lower),
  Lagan, Foyle (with the Finn branch). These are smoothed waypoint polylines through the right towns, not
  survey data.
- Final lines are Douglas-Peucker simplified at 0.0012 deg (OSM/hybrid) or 0.002 deg (NE) and rounded to
  4 decimals; the whole rivers array is ~85 KB.

## world.json (~748 KB)
All from Natural Earth v5 (public domain, naturalearthdata.com), fetched from
github.com/nvkelso/natural-earth-vector.
- **countries (237)**: `ne_50m_admin_0_countries`. Excluded non-country units: Siachen Glacier, Baikonur,
  Cyprus UN buffer zone, Dhekelia, Akrotiri, Spratly Is., Scarborough Reef, Serranilla Bank, Bajo Nuevo Bank,
  Clipperton, Coral Sea Is., Ashmore and Cartier Is., Indian Ocean Territories, Guantanamo Bay, Brazilian I.,
  S. Patagonian Ice Field, Bir Tawil. Somaliland was dissolved into Somalia and Northern Cyprus into Cyprus
  (exact-edge dissolve succeeded for both). Abbreviated NE names expanded (United States, DR Congo,
  Bosnia and Herzegovina, Czechia, Eswatini, Western Sahara, Saint Vincent and the Grenadines ...).
  ISO_A2 "-99" fixed via ISO_A2_EH (France FR, Norway NO, Kosovo XK ...). `area` is the spherical area in km2
  of the full NE geometry (so France includes French Guiana etc.). `label` is the centroid of the largest
  polygon, hand-nudged for ~30 countries (US, Canada, Russia, Norway, Chile, Indonesia, Japan, Malaysia,
  Philippines, New Zealand, Denmark, Croatia, Vietnam, Antarctica, Greenland, Italy, UK, Sweden ...).
  Rings are outer rings only, Douglas-Peucker 0.03 deg, 3 decimals, islets under 20 km2 dropped (a country's
  largest polygon is always kept, with finer simplification for micro-states). The array is sorted by area
  descending so a renderer that paints in order draws enclaves (Lesotho, San Marino, Vatican) on top.
- **capitals (233)**: `ne_10m_populated_places`, FEATURECLA "Admin-0 capital" (then "alt", "region capital",
  and for small dependencies "Admin-1 capital"), matched by ADM0_A3 or country name. Hand overrides:
  Washington, D.C., Copenhagen, Astana, Pretoria, Dodoma, Yamoussoukro, Gitega, Porto-Novo, Ngerulmud,
  Sri Jayawardenepura Kotte, Laayoune, Bogotá, Port of Spain, Andorra la Vella, Hagåtña, Ramallah (Palestine)
  and capitals of ~25 dependencies missing in NE (Saint Helier, Saint Peter Port, Road Town, Tórshavn ...).
  No capital for Antarctica, French Southern Territories, Heard Island and McDonald Islands, BIOT.
- **water (120: 7 oceans, 59 rank-2 seas, 54 rank-3)**: `ne_10m_geography_marine_polys`; label = centroid of
  the largest polygon (checked against the country polygons; 5 nudged into open water). Ocean labels are
  hand-placed (Atlantic x2, Pacific x2, Indian, Southern, Arctic). Rivers and the ambiguous "Inner Seas"
  polygon dropped; Spanish/French names translated (Gulf of California, Bay of Campeche, Gulf of Lion ...).
- **lakes (45)**: `ne_50m_lakes`, the 36 largest natural lakes (reservoirs excluded) plus Lake Chad,
  Great Salt Lake, Lake Urmia, Lake Van, Dead Sea, Qinghai Lake, Lake Geneva, Lough Neagh, Lake Toba and
  Lake Volta, and the Caspian Sea taken from the marine polygons (NE does not keep it in the lakes layer).
  Douglas-Peucker 0.02 deg, 3 decimals.

## Approximations / gaps summary
- Scotland uses council areas, not lieutenancy areas.
- City of London is merged into Greater London.
- 6 of the 52 UK rivers (Humber, Medway, Great Stour, Bann, Lagan, Foyle) are smoothed waypoint polylines only; the other hybrid rivers use real OSM geometry for most of their length with waypoint fills at the gaps.
- Isle of Man and Channel Islands are not in uk.json.
