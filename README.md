# readpaper-kit

Shared styles and renderer for **readpaper** pages: paper cards and deep notes embedded in Notion.
No paper content lives here; each page carries its own content and links to this kit.

| File | Role |
|-|-|
| `v1/kit.css` | Design tokens and components. Themes: `a` 纸本 (default), `c` 期刊 |
| `v1/kit.js` | Renders the card from the page's `<script type="application/json" id="rp-data">`, lays out `<main class="rp-note">`, switches to embed mode inside iframes, loads MathJax on demand |

## Page contract

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/yelonhu/readpaper-kit@main/v1/kit.css">
<main class="rp-note">…deep note body (optional)…</main>
<script type="application/json" id="rp-data">{ "schema": "readpaper/1", … }</script>
<script src="https://cdn.jsdelivr.net/gh/yelonhu/readpaper-kit@main/v1/kit.js"></script>
```

## Changing the look

- **Switch the theme for every page:** edit `DEFAULT_THEME` in `v1/kit.js`.
- **Tweak styles:** edit `v1/kit.css`. Pages load the kit through jsDelivr (`@main`). To make a change show up immediately, open
  `https://purge.jsdelivr.net/gh/yelonhu/readpaper-kit@main/v1/kit.css` and `…/v1/kit.js` once; otherwise the CDN refreshes on its own within hours.
- **Breaking changes** to the JSON or the markup go into `v2/`, so existing pages keep working.
