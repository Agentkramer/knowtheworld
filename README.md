# Know the World

One country at a time. A static site for learning every country, its flag and
its capital — a random country on every visit, a "surprise me" button, search,
a quiz mode, a sortable list of every country, four design themes and five
languages (EN/DE/FR/IT/ES).

## Stack

- **Vite + vanilla TypeScript**, no runtime framework
- All data baked at build time — the site is fully static, no API calls at runtime
- Fonts self-hosted via Fontsource (Fraunces, Inter, Space Grotesk, IBM Plex Mono)

## Data pipeline

`npm run data` regenerates everything (needs network):

- [`world-countries`](https://github.com/mledoze/countries) (npm) — codes, names
  incl. DE/FR/IT translations, capital, region, area, coordinates, borders,
  languages, currencies, calling codes
- **Wikidata** (SPARQL) — population, founding year, form of government and
  localized capital names in all four languages
- [`flag-icons`](https://github.com/lipis/flag-icons) (npm) — flag SVGs, copied
  to `public/flags/`
- [`world-atlas`](https://github.com/topojson/world-atlas) — Natural Earth 110m
  country shapes, projected (Natural Earth projection) to SVG paths at build
  time in `src/data/world-map.json`, in two variants: standard (0° center)
  and pacific-centered (150°E) so Oceania zooms aren't split at the map edge

Note: REST Countries was the original plan but shut down its free API in favor
of a keyed v5 — the current pipeline has no API-key dependencies at all.

Language- and currency-*names* ("Schweizer Franken", "franc suisse") are not in
the dataset; they come from the browser's `Intl.DisplayNames` at runtime.

## Architecture notes

- **Themes**: every color/font/shape decision is a CSS custom property in
  `src/themes.css`; `data-theme` on `<html>` swaps the whole set. Themes:
  `atlas` (flagship, editorial serif), `swiss`, `dark` (Nocturne), `vintage`.
- **i18n**: UI strings and region names in `src/i18n.ts`; country/capital/
  government names are localized fields in `countries.json`.
- **Quiz** (`src/quiz.ts`): three question types (flag → country,
  country → capital, map → country), distractors drawn from the same
  subregion/region so questions are genuinely hard; score and streak persist.
  Keyboard: `1–4` to answer, `Space` for the next question.
- **List** (`src/list.ts`): all 194 countries sorted by name, capital,
  population, area or density. Text sorts through `Intl.Collator` in the
  active language (so "Ägypten" lands under A in German, "Égypte" under E in
  French); missing values always sort last, ties fall back to country name.
  On phones the table becomes cards and the column heads are replaced by a
  chip row sharing the same `data-sort` hooks.
- **Deploy**: `.github/workflows/deploy.yml` builds and publishes to GitHub
  Pages on every push to `main` (`DEPLOY_BASE` sets the Vite base path).
  Switching to the custom domain means setting `DEPLOY_BASE` to `/`.
- **Randomization**: shuffled deck (`src/deck.ts`) — every country appears once
  before any repeats; deck and seen-progress persist in `localStorage`.
- **Map**: clickable — clicking a country jumps to it (hover shows its name);
  a World/Continent/Region toggle zooms via a CSS transform on the
  pre-projected SVG, picking whichever projection variant keeps the region
  tightest. Countries too small for the 110m map aren't clickable (reachable
  via search/neighbours); the marker dot covers them.
- **Routing**: `#xyz` hash with the ISO cca3 code, so countries are linkable.
- Keyboard: `Space` or `R` for the next random country.
- The ↺ button next to the counter resets seen-progress (or the quiz score
  when in quiz mode).

## Commands

```sh
npm run dev      # dev server
npm run build    # typecheck + production build (dist/)
npm run data     # refresh countries.json, world-map.json, flags
```

## Roadmap

- [ ] TRMNL X plugin (e-ink; reuse countries.json — flag renders dithered, so
      lead with capital/map/facts)
- [ ] Hand-curate government form for the 19 countries missing it in Wikidata
      (rendered as "—" for now): TD CR DJ DM DO GQ ER FJ GW HT KE KI MV ML MH
      PY WS TO VU
- [ ] Square/odd flags (CH, VA, NP) are forced to 4:3 — consider 1x1 variants
- [ ] Per-country "notable fact" (curated)
