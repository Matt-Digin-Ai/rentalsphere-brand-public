# RentalSphere Searchable Archive

This repo contains the searchable RentalSphere Knowledge Base.

## Files

- `index.html` — the searchable front-end app.
- `data/archive.json` — the content Shaun updates.
- `wordpress-embed.html` — iframe snippet for WordPress.
- `.nojekyll` — ensures GitHub Pages serves the files as-is.

## How to publish with GitHub Pages

1. Use the existing public repo `Matt-Digin-Ai/rentalsphere-brand-public`.
2. Upload or edit the files in this repo.
3. In GitHub, go to **Settings → Pages**.
4. Under **Build and deployment**, set:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Save.
6. GitHub will publish the archive at:
   `https://matt-digin-ai.github.io/rentalsphere-brand-public/`

## How to embed in WordPress

1. Open `wordpress-embed.html`.
2. Replace:
   `https://matt-digin-ai.github.io/rentalsphere-brand-public/`
   with the live GitHub Pages URL.
3. Paste the code into a **Custom HTML** block on the WordPress page.

## How Shaun updates content

Shaun only needs to edit:

`data/archive.json`

Each item should follow this structure:

```json
{
  "id": "RIC_2518",
  "type": "episode",
  "title": "Example title",
  "subtitle": "Solo — Shaun Luyt",
  "meta": "RIC 2518 · Oct 2025 · 60 min",
  "badge": "Inner Circle",
  "bc": "ric",
  "summary": "Short searchable summary...",
  "nuggets": ["Useful timestamp or key insight"],
  "topics": ["Topic one", "Topic two"],
  "leg": ["Rental Housing Act"],
  "url": "https://rentalsphere.co.za/ric",
  "member": true,
  "s": "lowercase searchable text title summary topics legislation"
}
```

Commit the change. GitHub Pages updates automatically. The WordPress iframe then loads the latest archive.

## Notes

- The original starter file had the full data array embedded directly inside the HTML.
- This version separates the data into `data/archive.json`, so the front-end does not need to be edited for every content update.
- The visible archive count and legislation filter are generated dynamically from the JSON.
- Current starting data: 84 resources, including 48 Inner Circle episodes and 36 blog articles.
