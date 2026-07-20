// Builds src/data/world-map.json: SVG path strings for every country
// (Natural Earth 110m via world-atlas), projected with geoNaturalEarth1,
// keyed by cca3, plus a marker point per country (path centroid, falling
// back to the dataset's lat/lng for countries too small for the 110m map).
// Run: npm run data

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";

const require = createRequire(import.meta.url);
const topo = require("world-atlas/countries-110m.json");
const worldCountries = require("world-countries");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const WIDTH = 1000;
const projection = geoNaturalEarth1().fitWidth(WIDTH, { type: "Sphere" });
const pathGen = geoPath(projection);
const [[, , ], [, bottom]] = [[0, 0], pathGen.bounds({ type: "Sphere" })[1]];
const HEIGHT = Math.ceil(bottom);

const features = feature(topo, topo.objects.countries).features;

// world-atlas ids are numeric ISO 3166-1 (= ccn3).
const byCcn3 = new Map(features.map((f) => [String(f.id).padStart(3, "0"), f]));

const countries = [];
const points = {};
for (const c of worldCountries) {
  if (c.independent !== true) continue;
  const f = c.ccn3 ? byCcn3.get(c.ccn3) : null;
  if (f) {
    countries.push({ id: c.cca3, d: pathGen(f) });
    points[c.cca3] = pathGen.centroid(f).map((v) => Math.round(v * 10) / 10);
  } else if (c.latlng) {
    const p = projection([c.latlng[1], c.latlng[0]]);
    if (p) points[c.cca3] = p.map((v) => Math.round(v * 10) / 10);
  }
}

const out = {
  viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
  sphere: pathGen({ type: "Sphere" }),
  graticule: pathGen(geoGraticule10()),
  countries,
  points,
};

await fs.mkdir(path.join(ROOT, "src/data"), { recursive: true });
await fs.writeFile(path.join(ROOT, "src/data/world-map.json"), JSON.stringify(out));
console.log(
  `Map: ${countries.length} country paths, ${Object.keys(points).length} markers, viewBox 0 0 ${WIDTH} ${HEIGHT}`,
);
