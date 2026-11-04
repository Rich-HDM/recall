# Recall

A small, read-only reference app for things worth memorising: British kings and queens,
Prime Ministers, US Presidents, two zoomable maps and two timelines. Built for a phone,
installable to the home screen, works offline.

## How it is built

Plain HTML, CSS and JavaScript. No build step, no framework, no dependencies.

- `index.html`, `styles.css`, `app.js` – the app shell, router and list pages
- `maps.js` – projects the map data to SVG and handles pan, pinch and wheel zoom
- `sw.js` – service worker for offline use (bump `VERSION` when files change)
- `data/collections.json` – the tiles on the home page
- `data/<id>.json` – one file per list, grouped into sections with items and facts
- `data/maps/uk.json`, `data/maps/world.json` – map geometry (see `data/maps/SOURCES.md`)

## Editing content

Each list file looks like this:

```json
{
  "groups": [
    {
      "name": "House of Tudor", "dates": "1485 – 1603", "colour": "teal",
      "items": [
        {"name": "Henry VIII", "dates": "1509 – 1547", "tag": "optional", "facts": ["One sentence per fact."]}
      ]
    }
  ]
}
```

Colours: red, orange, amber, green, teal, blue, indigo, purple, pink, brown, grey.

To add a collection, add a line to `data/collections.json` and a matching data file.
After changing any file, bump `VERSION` in `sw.js` so installed copies pick up the update.

## Running locally

Any static file server works, for example:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.
