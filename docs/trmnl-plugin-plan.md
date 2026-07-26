# TRMNL X Plugin — Plan

Final phase of the Know the World project: a TRMNL e-ink plugin that reuses the
site's data. This document is self-contained so a fresh session can start here.

## Project context

- Static site (Vite + vanilla TS), live at **https://www.knowtheworld.net**
  (custom domain on GitHub Pages, repo `Agentkramer/knowtheworld`).
- Deploy: push to `main` → GitHub Actions builds and publishes. Vite `base` is
  `"./"` (relative), so assets work at any path.
- Data pipeline (`npm run data`): `scripts/build-data.mjs` (→ `src/data/countries.json`
  + `src/data/meta.json`), `scripts/build-map.mjs` (→ `src/data/world-map.json`,
  SVG country-path strings, standard + pacific projection variants),
  `scripts/build-og.mjs`. Sources: world-countries (ODbL), Wikidata (CC0),
  flag-icons (MIT), Natural Earth. Flags are copied to `public/flags/<cca2>.svg`.
- `countries.json` holds **202 entries** (194 sovereign + 8 territories), each with:
  `cca2`, `cca3`, localized `name`/`capital`/`government` (en/de/fr/it/es +
  native/official), `region`, `subregion`, `area`, `population`, `founded`,
  `latlng`, `borders`, `languages`, `currencies`, `callingCode`,
  `wikipedia` (per-language URLs), `territory` (bool), `note` (localized status).
- `world-map.json`: `{ viewBox, width, height, standard, pacific }`; each variant
  `{ sphere, graticule, countries: [{id: cca3|null, d}], points: {cca3: [x,y]} }`.
  A country's outline is the path `d` whose `id === cca3`.

## TRMNL facts (researched)

- **TRMNL X**: 1872×1404 px, 10.3", **16 grayscale levels** (not 1-bit), 227 PPI,
  full refresh 1.2s. **TRMNL OG**: 800×480, ~1-bit.
- **Private plugins**, "Polling" strategy: TRMNL fetches one or more URLs on a
  schedule. **A static JSON on our own domain is explicitly allowed** — so we host
  `trmnl/data.json` on knowtheworld.net; no server.
- Rendering is **server-side**: TRMNL renders our HTML+Liquid into an image; the
  device shows the image. So inline SVG map outlines rasterize crisply.
- Templating: **Liquid** (Shopify). A plugin ZIP has `settings.yml` + `.liquid`
  files per layout: `full`, `half_horizontal`, `half_vertical`, `quadrant`.
- Design framework: TRMNL's `plugins.css`/`plugins.js` (classes `.layout`,
  `.columns`, `.title_bar`, `.value`, `.label`, …), Inter font — handles OG vs X
  sizing.
- Custom form fields (e.g. a language select) are defined in `settings.yml` and
  read in templates as merge variables.
- **`trmnlp`** (github.com/usetrmnl/trmnlp) is a local dev server that renders the
  plugin to an image — lets us verify layout locally without the device.
- Uncertainty: docs detail render resolution for OG (800×480) but are vague for X.
  Confirm via `trmnlp` / the real device.
- Prerequisite: Developer add-on / BYOD licence. **Confirmed active on the user's
  account.**

## Decisions (agreed with the user)

1. **Cadence: country of the day.** The template derives the index from the current
   date (day-of-year → index into the 202-country array). Rotates daily, purely
   static, battery-friendly.
2. **Content: balanced.** Prominent: country name, capital, and the **map outline
   with the location** (the hero — line art is crisp on e-ink). Plus 3–4 key facts
   (population, area, region). Flag small/secondary (grayscale loses the colour
   that distinguishes many flags).
3. **Language: settable in the plugin** via a `settings.yml` select
   (de/en/fr/it/es). Template reads localized fields dynamically:
   `country.name[lang]` etc. → so `data.json` must keep localized sub-objects.
4. **Devices: optimise for X, keep OG-compatible** (user intends to share the
   plugin; some users have OG). Lean on the TRMNL framework so both sizes work.

## Architecture

- New build step (e.g. `scripts/build-trmnl.mjs`, added to `npm run data`) emits
  `public/trmnl/data.json`: array of 202 countries with the fields the balanced
  layout needs, localized (name, capital, region in all 5 langs; population, area).
- **Map handling — decide by payload size at build time:**
  - Option A (preferred if small): host one small SVG per country at
    `public/trmnl/maps/<cca3>.svg` (country outline + location marker, single
    projection, from `world-map.json`); template references
    `https://www.knowtheworld.net/trmnl/maps/{{ country.cca3 }}.svg` via `<img>`.
    Keeps the poll payload tiny.
  - Option B: embed each path string in `data.json` and inline as SVG. Simpler
    hosting, larger payload (~300–500KB). Watch TRMNL's payload limit.
- Date→index in Liquid: `{{ 'now' | date: '%j' }}` → day-of-year; `| minus: 1 |
  modulo: 202` → index; access `countries[idx]`. **Verify** array-by-variable
  indexing and `modulo` behaviour in `trmnlp`.
- `settings.yml`: polling strategy, polling URL = the hosted `data.json`, a
  `lang` select form field.
- Templates: `full.liquid` first (works on X and OG full-screen); add
  `half_*`/`quadrant` later if wanted.

## Workflow / sequencing

1. **Build (device-independent, can verify locally):** the data export, map assets,
   `settings.yml`, `.liquid` templates. Run `trmnlp` and render a preview image;
   iterate on layout. (This session can do all of this.)
2. **Deploy:** commit → the `trmnl/` files publish to knowtheworld.net via the
   existing Actions pipeline.
3. **Install (needs the user + device):** create the private plugin in TRMNL, set
   the polling URL to the hosted `data.json`, install on the X, fine-tune from the
   real device. Confirm the X render resolution here.

## Open items — resolved in the first build (2026-07-26)

- **Payload limit → Option A chosen.** TRMNL polling responses that exceed
  **~100 KB** put the plugin into a *degraded* state (the 2 KB/5 KB figure is the
  *webhook* limit, not polling). So embedding all 202 outline paths inline
  (Option B, ~210–410 KB) was ruled out. Instead: a lean text-only `data.json`
  (**63 KB**) + hosted map SVGs.
- **Map (Option A, refined into two layers):**
  `public/trmnl/basemap.svg` (194 KB, the static world land — served once,
  cached by the device) + `public/trmnl/maps/<cca3>.svg` (202 tiny overlays,
  224 KB total; today's country inked solid + a location marker, transparent,
  same viewBox). The template stacks the two `<img>`s with `object-fit:contain`,
  so they register pixel-perfect. Only `data.json` is polled daily.
- **Liquid `countries[idx]` + `modulo` → confirmed working** in `trmnlp`.
  `{{ 'now' | date: '%j' | minus: 1 | modulo: count }}` → index; `countries[idx]`
  with a variable index resolves; `country.n[lang]` nested lookup works too.
  Verified: day-of-year 207 → index 4 → Angola.
- **X render resolution:** `trmnlp` renders TRMNL X at a logical **1040×780**
  (4:3, same aspect as the 1872×1404 panel); the framework scales type via
  `value--*`/`text--*` classes, so the one `full.liquid` works on both X and OG.

## Status

- Build step: `scripts/build-trmnl.mjs` (wired into `npm run data`). Emits
  `public/trmnl/{data.json, basemap.svg, maps/*.svg}`. Region/UI labels are
  pulled straight from `src/i18n.ts` so wording never drifts from the site.
- Plugin project: `trmnl-plugin/` — `src/settings.yml` (polling + `lang` select
  de/en/fr/it/es) and `src/{full,half_horizontal,half_vertical,quadrant}.liquid`.
- **Local render recipe** (device-independent, fully verified):
  1. `node scripts/build-trmnl.mjs`
  2. Serve assets so the preview can load the maps:
     `cd public && python3 -m http.server 8099`
  3. Generate `trmnl-plugin/.trmnlp.yml` (git-ignored) with the polled data as
     local `variables:` + `asset_base` + `lang` (a small node snippet spreads
     `data.json` into it; JSON is valid YAML). Use `asset_base:
     http://localhost:8099` for the **HTML preview** (loaded by your browser) or
     `http://host.docker.internal:8099` for `trmnlp`'s **server-side PNG** render.
     In production `asset_base` is unset → template falls back to
     `https://www.knowtheworld.net`.
  4. `cd trmnl-plugin && docker run --rm --publish 4567:4567 --volume "$(pwd):/plugin" trmnl/trmnlp serve --bind 0.0.0.0`
     (image is `trmnl/trmnlp` on **Docker Hub**, not ghcr). Open
     `http://localhost:4567/full`, pick "TRMNL X" + "4 Grays".

## Still open (need the user + device)

- Install the private plugin on the TRMNL account, set polling URL to the hosted
  `data.json`, confirm the real X render + the external `<img>` fetches behave the
  same server-side as in `trmnlp`.
- Deploy: commit so `public/trmnl/*` publishes to knowtheworld.net (Vite copies
  `public/` verbatim; assets are referenced by absolute prod URL).
