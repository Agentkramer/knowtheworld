// Builds src/data/world-map.json: SVG path strings for every country
// (Natural Earth 110m via world-atlas), projected with geoNaturalEarth1,
// keyed by cca3, plus a marker point per country (path centroid, falling
// back to the dataset's lat/lng for countries too small for the 110m map).
//
// Two variants are generated: "standard" (0° center) and "pacific"
// (150°E center). Region zooms around the antimeridian (Oceania,
// Polynesia, …) use the pacific variant so they aren't split across
// the map edges.
// Run: npm run data

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";

import { TERRITORY_CODES } from "./territories.mjs";

const require = createRequire(import.meta.url);
const topo = require("world-atlas/countries-110m.json");
const worldCountries = require("world-countries");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const WIDTH = 1000;
const features = feature(topo, topo.objects.countries).features;

// Highlightable = sovereign countries plus the non-sovereign territories that
// get their own page. Everything else that has a polygon is drawn as neutral
// land (no id → not clickable). Antarctica is dropped entirely.
const TERRITORIES = new Set(TERRITORY_CODES);
const highlightable = worldCountries.filter(
  (c) => c.independent === true || TERRITORIES.has(c.cca2),
);
// world-atlas ids are numeric ISO 3166-1 (= ccn3).
const ccn3ToCca3 = new Map();
for (const c of highlightable) if (c.ccn3) ccn3ToCca3.set(c.ccn3, c.cca3);
// Kosovo's atlas polygon carries no ccn3, so match it by name.
const kosovo = highlightable.find((c) => c.cca2 === "XK");
const nameToCca3 = new Map(kosovo ? [["Kosovo", kosovo.cca3]] : []);
const SKIP_CCN3 = new Set(["010"]); // Antarctica

let HEIGHT = 0;

function buildVariant(centerLon) {
  const projection = geoNaturalEarth1()
    .rotate([-centerLon, 0])
    .fitWidth(WIDTH, { type: "Sphere" });
  const pathGen = geoPath(projection);
  HEIGHT = Math.ceil(pathGen.bounds({ type: "Sphere" })[1][1]);

  const countries = [];
  const points = {};
  const drawn = new Set();

  for (const f of features) {
    const ccn3 = String(f.id).padStart(3, "0");
    if (SKIP_CCN3.has(ccn3)) continue;
    let cca3 = ccn3ToCca3.get(ccn3) ?? null;
    if (!cca3 && (f.id === undefined || Number.isNaN(Number(f.id)))) {
      cca3 = nameToCca3.get(f.properties?.name) ?? null;
    }
    // id null → neutral land: painted, but not highlightable or clickable.
    countries.push({ id: cca3, d: pathGen(f) });
    if (cca3) {
      points[cca3] = pathGen.centroid(f).map((v) => Math.round(v * 10) / 10);
      drawn.add(cca3);
    }
  }

  // Highlightable entities too small for the 110m map get a marker point only.
  for (const c of highlightable) {
    if (drawn.has(c.cca3) || !c.latlng) continue;
    const p = projection([c.latlng[1], c.latlng[0]]);
    if (p) points[c.cca3] = p.map((v) => Math.round(v * 10) / 10);
  }

  return {
    sphere: pathGen({ type: "Sphere" }),
    graticule: pathGen(geoGraticule10()),
    countries,
    points,
  };
}

const standard = buildVariant(0);
const pacific = buildVariant(150);

const out = {
  viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
  width: WIDTH,
  height: HEIGHT,
  standard,
  pacific,
};

await fs.mkdir(path.join(ROOT, "src/data"), { recursive: true });
await fs.writeFile(path.join(ROOT, "src/data/world-map.json"), JSON.stringify(out));
const highlightPaths = standard.countries.filter((c) => c.id).length;
const landPaths = standard.countries.filter((c) => !c.id).length;
console.log(
  `Map: ${highlightPaths} highlightable + ${landPaths} neutral-land paths ×2 variants, ` +
    `${Object.keys(standard.points).length} markers, viewBox 0 0 ${WIDTH} ${HEIGHT}`,
);
