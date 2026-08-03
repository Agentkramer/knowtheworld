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

## Status — shipped (2026-07-27)

Built, deployed, installed on the device and **submitted to the TRMNL
marketplace** (last review round returned only suggestions/nitpicks).

- Build step: `scripts/build-trmnl.mjs` (wired into `npm run data`). Emits
  `public/trmnl/{data.json, basemap.svg, maps/*.svg}` **and generates
  `trmnl-plugin/src/shared.liquid`** — the localized UI labels and region names
  are baked into the shared markup (sourced from `src/i18n.ts`, so wording never
  drifts from the site) instead of riding along in every poll. `data.json` is
  therefore only the country array: **~59 KB**.
- Plugin project: `trmnl-plugin/` — `src/settings.yml` (polling + `lang`,
  `sequence` and `start_date` fields + an `author_bio` support block) and
  `src/{shared,full,half_horizontal,half_vertical,quadrant}.liquid`, plus
  `icon.svg`/`icon.png` (512²) for the marketplace listing.
- Live: <https://www.knowtheworld.net/trmnl/data.json>, `/trmnl/basemap.svg`,
  `/trmnl/maps/<cca3>.svg`. Purely additive — no existing page or asset changed.
- **Importing does not update an existing plugin** — TRMNL's import always
  creates a *new* one. Changes to a plugin that already exists must be pasted
  into its Markup editor tabs (Shared / Full / Half Horizontal / Half Vertical /
  Quadrant) by hand. `trmnl-plugin/know-the-world-trmnl.zip` (flat file list, no
  `src/` folder, git-ignored build artifact) is only useful for a *first* import.
- Markup conventions the review process settled on: no inline `style=` and no
  `<style>` block (the map is one inline `<svg>` that stacks basemap + overlay
  through a shared viewBox); `image image-dither` on the map but not on the
  favicon; `value--*` for sizing (note `title--xxlarge` is only 40px, smaller
  than `value--large`, so the country name uses `value--xlarge`);
  `portrait:flex--col` + `portrait:w--full` to stack columns in portrait
  (`.column` carries `width:0`, which collapses without the latter).
- Automated review hints proved unreliable: they analyse the markup **without
  executing the poll**, so they repeatedly reported a missing `polling_url` and
  missing guards that were present, and suggested lines already in the file.
  Verify against the actual files before acting on them.

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

## When the country changes — and the render-dedup trap (important)

Three things gate when a new country appears, and the third one bit us:

1. **Which country is "today's"** — decided purely by the calendar, in the shared
   markup. With a **`start_date`** set (a `date` field, `default: today`, so it
   pre-fills with the setup day), day 0 is that date:
   `('now' - start_date) / 86400 | modulo: 202`. Without one it falls back to the
   day of the year. The index is then mapped through the `order` permutation
   unless `sequence` is `alphabetical`.
2. **`refresh_interval`** in `settings.yml` (**360** = 6 h) — how often TRMNL
   *polls* our URL. It is not midnight-aligned. (Allowed: 15 | 60 | 360 | 720 |
   1440.)
3. **TRMNL only re-renders when the polled payload changed.** From the TRMNL
   docs: *"When TRMNL syncs content, but it matches the previously synced content
   (from 15+ minutes ago), the system stops and does not re-render."* There is no
   markup flag to force it (`TRMNL_SKIP_SCREEN_GENERATION` only *skips*).

### The trap

`data.json` was a **static file** — byte-identical every day. The country is
chosen at *render* time from `now`, but TRMNL never re-rendered, because the
*synced data* never changed. Result: the plugin froze on one country for days;
only saving the settings (a forced Force-Refresh) advanced it. Polling the URL
more often does nothing — polling is not rendering.

### The fix (deploy pipeline, not markup)

The daily change has to live in the *payload*. `.github/workflows/deploy.yml`
now runs `node scripts/build-trmnl.mjs` on every deploy **and on a
`schedule: cron` ("5 0,12 * * *", twice daily)**. That re-stamps `data.json`'s
`tick` heartbeat — `YYYY-MM-DD-AM|PM` by UTC hour — so the polled payload
differs twice a UTC day → TRMNL re-renders → the shared markup recomputes the
correct country (from the account timezone's `now`). The build step is
self-contained (reads only committed `src/data` + `src/i18n.ts`, no external
APIs), so the daily job can't be broken by an upstream outage.

Why twice a day (AM/PM) rather than once: a single 00:00 UTC render lands the
new country in the morning east of UTC but only in the *evening* for the
Americas (their local midnight is 04:00–08:00 UTC, after the render, so they
wait until the next day's render). The 12:05 UTC run gives the western
hemisphere its own post-midnight re-render, so everyone gets the change in their
morning. The extra render is a harmless duplicate where the country hasn't
changed. It also doubles as a retry if one run fails.

Consequences to remember:
- The country still only advances **once per local day**; the two heartbeats are
  just two render opportunities, not two countries.
- `tick` is a heartbeat only — the templates never read it; its sole job is to
  differ so TRMNL doesn't dedupe the render away.
- **Sub-daily rotation was considered and declined** (2026-07-30). A per-user
  interval field can only change the Liquid counter speed; the *re-render*
  cadence is global and bounded by the heartbeat + `refresh_interval`. Supporting
  e.g. 4 h would force hourly polling for everyone (no native 4 h tier) and a
  4×–6× daily deploy, disproportionate for a "country of the day" display. Kept
  daily-only.

### Reading form fields — the second dedup-class trap

Custom field values are **not** top-level Liquid variables on the platform. They
live under `trmnl.plugin_settings.custom_fields_values.<keyname>`. Reading a bare
`{{ lang }}` compiles and renders fine — it just silently resolves to nil, so
every field falls back to its default. Symptom: language stays English, order
stays shuffled, start date is ignored, all at once, with no error anywhere.

`shared.liquid` therefore reads the platform path first and falls back to the
bare name (which is all `trmnlp` provides locally):

```liquid
{%- assign cfv = trmnl.plugin_settings.custom_fields_values -%}
{%- assign lang = cfv.lang | default: lang | default: 'en' -%}
```

**Testing lesson:** the original `trmnlp` check passed because the values were
injected as top-level `variables:` — i.e. it exercised the one path the platform
never uses. When verifying form fields locally, put them under
`variables.trmnl.plugin_settings.custom_fields_values` to mirror the device.
Verified 2026-08-03 in all three shapes: platform path (de + alphabetical +
start date → Chad, day 33), top-level (fr + shuffled → Bolivie, day 9), and
nothing set (defaults → Colombia, en, shuffled).

### Order and start date

- `scripts/build-trmnl.mjs` emits an `order` array: a Fisher–Yates permutation of
  the 202 indices from a **fixed seed** (`SHUFFLE_SEED`). The seed is constant on
  purpose — reshuffling on every build would yank every installed device to a
  different country mid-cycle.
- `sequence` (select, default `shuffled`) switches between that permutation and
  plain A–Z. `start_date` (date, optional) sets day one.
- Verified in `trmnlp` (2026-07-27, 202 countries): start = today + shuffled →
  day 0 → New Zealand; start = 5 days earlier + shuffled → day 5 → Greenland;
  start = today + A–Z → index 0 → Afghanistan; no start date + A–Z → day-of-year
  208 → index 5 → Antigua and Barbuda.
- Because the counter is now days-since-start rather than day-of-year, the
  sequence walks all 202 countries once before repeating, instead of restarting
  every 1 January and wrapping again around day 203.

## Possible follow-ups (none blocking)

- Open review suggestions, deliberately not acted on: reusing the favicon markup
  via a shared capture, and scaling the map viewBox per layout for the quadrant.
