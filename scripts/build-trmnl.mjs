// Builds the TRMNL e-ink plugin assets under public/trmnl/:
//
//   data.json          — lean, localized "country of the day" payload (all 202
//                        countries; the template picks today's by date→index).
//                        Kept well under TRMNL's ~100 KB polling limit by using
//                        short keys and a shared region lookup instead of
//                        repeating localized region strings on every country.
//   basemap.svg        — the static world (neutral land, light grey), drawn once
//                        and reused for every country (cached by the device).
//   maps/<cca3>.svg    — per-country overlay: that country inked solid + a
//                        location marker, transparent, same viewBox as basemap
//                        so it registers pixel-perfect when stacked on top.
//
// The template stacks basemap + today's overlay, so the daily poll only ever
// transfers data.json (text) — the map geometry is served as cacheable assets.
// Run: npm run data  (or: node scripts/build-trmnl.mjs)

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public/trmnl");

const countries = JSON.parse(
  await fs.readFile(path.join(ROOT, "src/data/countries.json"), "utf8"),
);
const map = JSON.parse(
  await fs.readFile(path.join(ROOT, "src/data/world-map.json"), "utf8"),
);
const meta = JSON.parse(
  await fs.readFile(path.join(ROOT, "src/data/meta.json"), "utf8"),
);

// --- Pull the region lookup + UI labels straight from the site's i18n source,
//     so the plugin never drifts from the website's wording. We slice the two
//     object literals out of the TS file and evaluate them (they're plain data).
const i18n = await fs.readFile(path.join(ROOT, "src/i18n.ts"), "utf8");
function extractObject(src, marker) {
  const start = src.indexOf("{", src.indexOf(marker));
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) {
      // eslint-disable-next-line no-new-func
      return new Function(`return (${src.slice(start, i + 1)})`)();
    }
  }
  throw new Error(`Could not extract ${marker}`);
}
const REGIONS = extractObject(i18n, "const REGIONS: RegionMap =");
const STRINGS = extractObject(i18n, "export const STRINGS: Record<Lang, UiStrings> =");

const LANGS = ["en", "de", "fr", "it", "es"];

// Localized region name for all 5 languages (en is the key itself).
function regionAll(region) {
  const out = { en: region };
  for (const l of LANGS) if (l !== "en") out[l] = REGIONS[region]?.[l] ?? region;
  return out;
}

// UI chrome (field labels + a couple of plugin-only strings) per language.
const PLUGIN_STRINGS = {
  en: { ofDay: "Country of the day", territory: "Territory" },
  de: { ofDay: "Land des Tages", territory: "Territorium" },
  fr: { ofDay: "Pays du jour", territory: "Territoire" },
  it: { ofDay: "Paese del giorno", territory: "Territorio" },
  es: { ofDay: "País del día", territory: "Territorio" },
};
// Data snapshot ("as of …"), formatted per-language exactly like the website
// (Intl month name), from src/data/meta.json → e.g. "2026-07" → "Juli 2026".
const [snapY, snapM] = String(meta.generatedAt).split("-").map(Number);
const asOfDate = (l) =>
  snapY && snapM
    ? new Intl.DateTimeFormat(l, { year: "numeric", month: "long" }).format(
        new Date(snapY, snapM - 1, 1),
      )
    : String(meta.generatedAt);

const ui = {};
for (const l of LANGS) {
  ui[l] = {
    capital: STRINGS[l].capital,
    population: STRINGS[l].population,
    area: STRINGS[l].area,
    region: STRINGS[l].zoomRegion, // "Region" — labels the subregion fact
    founded: STRINGS[l].founded,
    ofDay: PLUGIN_STRINGS[l].ofDay,
    territory: PLUGIN_STRINGS[l].territory,
    asOfDate: asOfDate(l), // "Juli 2026"
    asOf: STRINGS[l].dataAsOf.replace("{date}", asOfDate(l)), // "Datenstand: Juli 2026"
  };
}

// --- data.json ---------------------------------------------------------------
// Only the regions actually used, localized once and referenced by key.
const regions = {};
const pick = (loc) => Object.fromEntries(LANGS.map((l) => [l, loc?.[l] ?? loc?.en ?? null]));
// Locale-neutral thousands grouping (thin regular space) — reads cleanly on
// e-ink in any of the five languages and avoids relying on TRMNL Liquid filters.
const groom = (n) =>
  n == null ? null : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

const outCountries = countries.map((c) => {
  if (!regions[c.region]) regions[c.region] = regionAll(c.region);
  if (c.subregion && !regions[c.subregion]) regions[c.subregion] = regionAll(c.subregion);
  return {
    c2: c.cca2,
    c3: c.cca3,
    n: pick(c.name),
    cap: pick(c.capital),
    r: c.region,
    sr: c.subregion || c.region,
    pop: groom(c.population),
    area: groom(c.area),
    founded: c.founded,
    terr: c.territory ? 1 : 0,
  };
});

// --- shuffled running order ---------------------------------------------------
// `countries` is alphabetical, which makes the daily rotation feel like reciting
// a list. `order` is a fixed permutation of its indices, so the "shuffled" mode
// can walk the same array in a scattered sequence. The seed is a constant on
// purpose: reshuffling on every build would yank every installed device to a
// different country mid-cycle.
const SHUFFLE_SEED = 20260727;
function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SHUFFLE_SEED);
const order = outCountries.map((_, i) => i);
for (let i = order.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [order[i], order[j]] = [order[j], order[i]];
}

// data.json is the polled payload: only the daily-changing country data. The
// static UI labels + region names live in the plugin's shared markup instead
// (generated below), which keeps the poll small and the labels versioned with
// the templates.
//
// `tick` is a render heartbeat: TRMNL only regenerates a screen when the polled
// payload changes, so a static file would freeze the rotation. It changes twice
// a UTC day (AM/PM), driven by the deploy cron — enough that viewers west of UTC
// get the new country in their morning rather than their evening, without making
// the payload change so often that TRMNL re-renders needlessly. Not used by the
// templates; its only job is to differ.
const nowUtc = new Date();
const generated = nowUtc.toISOString().slice(0, 10);
const tick = `${generated}-${nowUtc.getUTCHours() < 12 ? "AM" : "PM"}`;
const data = {
  generated,
  tick,
  count: outCountries.length,
  order,
  countries: outCountries,
};

await fs.mkdir(path.join(OUT, "maps"), { recursive: true });
await fs.writeFile(path.join(OUT, "data.json"), JSON.stringify(data));

// --- shared.liquid -----------------------------------------------------------
// Generated: embeds the localized UI labels + region names (from src/i18n.ts) as
// parse_json'd Liquid data, plus the shared date→index setup. Uses {% capture %}
// so apostrophes (e.g. "Asie de l'Ouest") and quotes need no escaping.
const sharedLiquid = `{%- comment -%}
  GENERATED by scripts/build-trmnl.mjs — do not edit by hand.
  Shared setup prepended to every layout:
    - ui / regions: static localized strings (sourced from src/i18n.ts).
    - lang / base: form field + asset host (falls back to production).
    - country: today's entry, chosen by day-of-year with a modulo wrap.
  Guards a missing/empty payload: if countries is nil or empty, country is nil
  and each layout renders a fallback.
{%- endcomment -%}
{%- capture ui_json -%}${JSON.stringify(ui)}{%- endcapture -%}
{%- assign ui = ui_json | parse_json -%}
{%- capture regions_json -%}${JSON.stringify(regions)}{%- endcapture -%}
{%- assign regions = regions_json | parse_json -%}
{%- assign lang = lang | default: 'en' -%}
{%- assign base = asset_base | default: 'https://www.knowtheworld.net' -%}
{%- assign country_count = countries.size -%}
{%- assign idx = 0 -%}
{%- if countries and country_count > 0 -%}
  {%- comment -%}
    Day counter. With a start date set, day 0 is that date, so the sequence
    begins at its first entry on the day the plugin is configured. Without one
    we fall back to the day of the year, which still rotates daily.
  {%- endcomment -%}
  {%- assign day_number = 'now' | date: '%j' | minus: 1 -%}
  {%- if start_date and start_date != '' -%}
    {%- assign now_seconds = 'now' | date: '%s' | plus: 0 -%}
    {%- assign start_seconds = start_date | date: '%s' | plus: 0 -%}
    {%- assign elapsed = now_seconds | minus: start_seconds -%}
    {%- assign day_number = 0 -%}
    {%- if elapsed > 0 -%}
      {%- assign day_number = elapsed | divided_by: 86400 -%}
    {%- endif -%}
  {%- endif -%}
  {%- assign idx = day_number | modulo: country_count -%}
  {%- comment -%} Shuffled unless the reader asked for A–Z. {%- endcomment -%}
  {%- if sequence != 'alphabetical' and order -%}
    {%- assign idx = order[idx] -%}
  {%- endif -%}
{%- endif -%}
{%- assign country = countries[idx] -%}
`;
await fs.writeFile(path.join(ROOT, "trmnl-plugin/src/shared.liquid"), sharedLiquid);

// --- basemap.svg -------------------------------------------------------------
// Neutral land only (no id-based highlighting): the shared backdrop. Light grey
// land on a white ocean reads cleanly after e-ink dithering.
const std = map.standard;
const landPaths = std.countries.map((c) => c.d).join(" ");
const basemap =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${map.viewBox}" ` +
  `preserveAspectRatio="xMidYMid meet">` +
  `<path d="${std.sphere}" fill="#ffffff" stroke="#c8c8c8" stroke-width="1"/>` +
  `<path d="${std.graticule}" fill="none" stroke="#e6e6e6" stroke-width="0.6"/>` +
  `<path d="${landPaths}" fill="#d2d2d2" stroke="#ffffff" stroke-width="0.5" ` +
  `stroke-linejoin="round"/>` +
  `</svg>`;
await fs.writeFile(path.join(OUT, "basemap.svg"), basemap);

// --- per-country overlays ----------------------------------------------------
// The country inked solid + a location marker, transparent, same viewBox so it
// stacks exactly on the basemap. 173 countries have an outline path; the 29 too
// small for the 110m map get a marker only (their whole point).
const pathById = new Map(std.countries.filter((c) => c.id).map((c) => [c.id, c.d]));
let withPath = 0;
let markerOnly = 0;
for (const c of countries) {
  const d = pathById.get(c.cca3);
  const pt = std.points[c.cca3];
  let body = "";
  if (d) {
    body +=
      `<path d="${d}" fill="#1a1a1a" stroke="#000000" stroke-width="0.6" ` +
      `stroke-linejoin="round"/>`;
    withPath++;
  } else {
    markerOnly++;
  }
  if (pt) {
    const [x, y] = pt;
    // White halo → black ring → black dot: visible on both light land and the
    // dark fill of a large highlighted country.
    body +=
      `<g><circle cx="${x}" cy="${y}" r="13" fill="#ffffff" opacity="0.9"/>` +
      `<circle cx="${x}" cy="${y}" r="10.5" fill="none" stroke="#000000" stroke-width="3"/>` +
      `<circle cx="${x}" cy="${y}" r="3.5" fill="#000000"/></g>`;
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${map.viewBox}" ` +
    `preserveAspectRatio="xMidYMid meet">${body}</svg>`;
  await fs.writeFile(path.join(OUT, "maps", `${c.cca3}.svg`), svg);
}

// --- report ------------------------------------------------------------------
const dataBytes = Buffer.byteLength(JSON.stringify(data));
const basemapBytes = Buffer.byteLength(basemap);
let overlayBytes = 0;
for (const c of countries)
  overlayBytes += (await fs.stat(path.join(OUT, "maps", `${c.cca3}.svg`))).size;
console.log(
  `TRMNL: data.json ${(dataBytes / 1024).toFixed(1)} KB (poll payload) · ` +
    `basemap.svg ${(basemapBytes / 1024).toFixed(1)} KB · ` +
    `${countries.length} overlays (${withPath} outline, ${markerOnly} marker-only), ` +
    `${(overlayBytes / 1024).toFixed(1)} KB total`,
);
if (dataBytes > 100 * 1024)
  console.warn(`⚠  data.json exceeds TRMNL's ~100 KB polling limit!`);
