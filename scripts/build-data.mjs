// Builds src/data/countries.json from the open `world-countries` dataset,
// enriched with Wikidata (population, founding year, government form,
// localized capital names). Also copies flag SVGs into public/flags/.
// Run: npm run data

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import { TERRITORY_CODES, CAPITAL_OVERRIDE, NOTES } from "./territories.mjs";

const require = createRequire(import.meta.url);
const worldCountries = require("world-countries");
const TERRITORIES = new Set(TERRITORY_CODES);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPARQL_URL = "https://query.wikidata.org/sparql";
const USER_AGENT = "KnowTheWorld-build/0.1 (personal project; contact via GitHub)";
const LANGS = ["en", "de", "fr", "it", "es"];

async function sparql(query) {
  const url = `${SPARQL_URL}?query=${encodeURIComponent(query)}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, {
      headers: { Accept: "application/sparql-results+json", "User-Agent": USER_AGENT },
    });
    if (res.ok) return (await res.json()).results.bindings;
    if (attempt === 3) throw new Error(`SPARQL failed: ${res.status} ${await res.text()}`);
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
}

// Population + founding year (language-independent).
async function fetchBase() {
  const rows = await sparql(`
    SELECT ?iso (SAMPLE(?pop) AS ?population) (SAMPLE(YEAR(?inc)) AS ?year) WHERE {
      ?c wdt:P297 ?iso .
      OPTIONAL { ?c wdt:P1082 ?pop . }
      OPTIONAL { ?c wdt:P571 ?inc . }
    } GROUP BY ?iso`);
  const out = {};
  for (const r of rows) {
    out[r.iso.value] = {
      population: r.population ? Number(r.population.value) : null,
      founded: r.year ? Number(r.year.value) : null,
    };
  }
  return out;
}

// P31 classes that genuinely describe a form of government — used as a
// fallback for countries whose Wikidata item lacks P122.
const GOV_CLASS_QIDS = [
  "Q7270", // republic
  "Q41614", // constitutional monarchy
  "Q1520223", // constitutional republic
  "Q512187", // federal republic
  "Q43702", // federation
  "Q5255892", // democratic republic
  "Q4198907", // parliamentary republic
  "Q22909549", // unitary parliamentary republic
  "Q465613", // people's republic
  "Q849866", // communist state
  "Q842112", // socialist state
  "Q672729", // Islamic republic
  "Q417175", // kingdom
  "Q165116", // grand duchy
  "Q208500", // principality
  "Q12759805", // sultanate
  "Q189898", // emirate
  "Q133442", // city-state
  "Q170156", // confederation
  "Q202686", // Commonwealth realm
  "Q7396640", // sacerdotal state
];

// Government form + capital label for one language.
async function fetchLang(lang) {
  const values = GOV_CLASS_QIDS.map((q) => `wd:${q}`).join(" ");
  const rows = await sparql(`
    SELECT ?iso (GROUP_CONCAT(DISTINCT ?govLabel; separator="|") AS ?gov)
                (GROUP_CONCAT(DISTINCT ?altLabel; separator="|") AS ?govAlt)
                (SAMPLE(?capLabel) AS ?cap) WHERE {
      ?c wdt:P297 ?iso .
      OPTIONAL { ?c wdt:P122 ?g . ?g rdfs:label ?govLabel . FILTER(LANG(?govLabel) = "${lang}") }
      OPTIONAL { ?c wdt:P31 ?t . VALUES ?t { ${values} } ?t rdfs:label ?altLabel . FILTER(LANG(?altLabel) = "${lang}") }
      OPTIONAL { ?c wdt:P36 ?capE . ?capE rdfs:label ?capLabel . FILTER(LANG(?capLabel) = "${lang}") }
    } GROUP BY ?iso`);
  const out = {};
  for (const r of rows) {
    const first = (v) => (v?.value ? v.value.split("|").slice(0, 2).join(" · ") : null);
    out[r.iso.value] = {
      government: first(r.gov) ?? first(r.govAlt),
      capital: r.cap?.value ?? null,
    };
  }
  return out;
}

function pickLocalized(perLangData, iso, field) {
  const out = {};
  for (const lang of LANGS) {
    out[lang] = perLangData[lang][iso]?.[field] ?? null;
  }
  // Fall back to English for missing languages.
  for (const lang of LANGS) if (!out[lang]) out[lang] = out.en;
  return out;
}

// Wikipedia article URLs per language, via Wikidata sitelinks. Missing
// languages fall back to the English article.
async function fetchWikipedia() {
  const parts = LANGS.map(
    (lang) =>
      `OPTIONAL { ?${lang}_a schema:about ?c ; schema:isPartOf <https://${lang}.wikipedia.org/> . }`,
  ).join("\n      ");
  const select = LANGS.map((lang) => `(SAMPLE(?${lang}_a) AS ?${lang})`).join(" ");
  const rows = await sparql(`
    SELECT ?iso ${select} WHERE {
      ?c wdt:P297 ?iso .
      ${parts}
    } GROUP BY ?iso`);
  const out = {};
  for (const r of rows) {
    const links = {};
    for (const lang of LANGS) links[lang] = r[lang]?.value ?? null;
    for (const lang of LANGS) if (!links[lang]) links[lang] = links.en;
    out[r.iso.value] = links;
  }
  return out;
}

console.log("Fetching Wikidata (population, founding, government, capitals)...");
const base = await fetchBase();
const perLang = {};
for (const lang of LANGS) {
  perLang[lang] = await fetchLang(lang);
  console.log(`  labels [${lang}]: ${Object.keys(perLang[lang]).length} countries`);
}
const wikipedia = await fetchWikipedia();
console.log(`  wikipedia links: ${Object.keys(wikipedia).length} countries`);

const countries = worldCountries
  .filter((c) => c.independent === true || TERRITORIES.has(c.cca2))
  .map((c) => {
    const iso = c.cca2;
    const isTerritory = TERRITORIES.has(iso);
    const nativeParts = Object.values(c.name.native ?? {});
    const native = nativeParts[0]?.common ?? c.name.common;
    const capitals = pickLocalized(perLang, iso, "capital");
    // Neutral capital for the sensitive territories, applied across languages.
    if (CAPITAL_OVERRIDE[iso]) {
      for (const lang of LANGS) capitals[lang] = CAPITAL_OVERRIDE[iso];
    }
    const idd =
      c.idd?.root && c.idd.suffixes?.length === 1
        ? c.idd.root + c.idd.suffixes[0]
        : c.idd?.root ?? null;
    return {
      cca2: c.cca2,
      cca3: c.cca3,
      ccn3: c.ccn3 || null,
      name: {
        en: c.name.common,
        de: c.translations.deu?.common ?? c.name.common,
        fr: c.translations.fra?.common ?? c.name.common,
        it: c.translations.ita?.common ?? c.name.common,
        es: c.translations.spa?.common ?? c.name.common,
        native,
        official: c.name.official,
      },
      capital:
        c.capital?.length || CAPITAL_OVERRIDE[iso]
          ? { ...capitals, en: capitals.en ?? CAPITAL_OVERRIDE[iso] ?? c.capital[0] }
          : { en: null, de: null, fr: null, it: null },
      territory: isTerritory,
      note: isTerritory ? NOTES[iso] : null,
      region: c.region,
      subregion: c.subregion || null,
      area: c.area,
      population: base[iso]?.population ?? null,
      founded: base[iso]?.founded ?? null,
      government: pickLocalized(perLang, iso, "government"),
      latlng: c.latlng,
      borders: c.borders ?? [],
      languages: c.languages ?? {},
      currencies: Object.keys(c.currencies ?? {}),
      callingCode: idd,
      wikipedia: wikipedia[iso] ?? { en: null, de: null, fr: null, it: null, es: null },
    };
  })
  .sort((a, b) => a.name.en.localeCompare(b.name.en));

console.log(`Countries: ${countries.length}`);
const missing = countries.filter((c) => !c.population || !c.government.en);
if (missing.length) {
  console.log(`  incomplete (no population or government): ${missing.map((c) => c.cca2).join(", ")}`);
}
const noWiki = countries.filter((c) => !c.wikipedia.en);
if (noWiki.length) console.log(`  no Wikipedia link: ${noWiki.map((c) => c.cca2).join(", ")}`);

// "YYYY-MM" — the month the data was fetched, shown as the freshness stamp.
const generatedAt = new Date().toISOString().slice(0, 7);

await fs.mkdir(path.join(ROOT, "src/data"), { recursive: true });
await fs.writeFile(
  path.join(ROOT, "src/data/countries.json"),
  JSON.stringify(countries),
);
await fs.writeFile(
  path.join(ROOT, "src/data/meta.json"),
  JSON.stringify({ generatedAt }),
);
console.log(`Data stamp: ${generatedAt}`);

// Copy flag SVGs (flag-icons, MIT) into public/flags/.
const flagDir = path.join(ROOT, "public/flags");
await fs.mkdir(flagDir, { recursive: true });
let copied = 0;
for (const c of countries) {
  const src = path.join(ROOT, "node_modules/flag-icons/flags/4x3", `${c.cca2.toLowerCase()}.svg`);
  try {
    await fs.copyFile(src, path.join(flagDir, `${c.cca2.toLowerCase()}.svg`));
    copied++;
  } catch {
    console.warn(`  no flag for ${c.cca2}`);
  }
}
console.log(`Flags copied: ${copied}`);
console.log("Done → src/data/countries.json, public/flags/");
