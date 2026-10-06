# readpaper-kit

Shared styles and renderer for **readpaper** pages: paper cards and deep notes embedded in Notion.
No paper content lives here; each page carries its own content and links to this kit.

| File | Role |
|-|-|
| `v1/kit.css` | The 纸本 look: tokens (light and dark), the card (title line, meta line, glance panel), the deep-note components, the embed layout |
| `v1/kit.js` | Builds the card from the page's `<script type="application/json" id="rp-data">`, lays out `<main class="rp-note">` with a contents rail (wide) or a section bar (inside Notion), loads MathJax on demand |

## Page contract

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/yelonhu/readpaper-kit@main/v1/kit.css">
<main class="rp-note">…deep note body (optional)…</main>
<script type="application/json" id="rp-data">{ "schema": "readpaper/2", … }</script>
<script src="https://cdn.jsdelivr.net/gh/yelonhu/readpaper-kit@main/v1/kit.js"></script>
```

The card reads `keywords`, `headline`, `authors`, `institute`, `id`, `date`, `venue`, `links`, and the four glance rows `contribution`, `thesis`, `result`, `boundary` (each a string or `{text, src:{label,page}, infer}`). Card-only pages also show `figure` and `builds_on`.

## Changing the look

- **Tweak styles:** edit `v1/kit.css`. Pages load the kit through jsDelivr (`@main`). To make a change show up immediately, open
  `https://purge.jsdelivr.net/gh/yelonhu/readpaper-kit@main/v1/kit.css` and `…/v1/kit.js` once; otherwise the CDN refreshes on its own within hours.
- **Force light or dark for one page:** set `"theme": "light"` or `"dark"` in its JSON. By default the page follows the system setting.
- **Breaking changes** to the JSON or the markup go into `v2/`, so existing pages keep working.
