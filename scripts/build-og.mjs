// Renders the social-share (Open Graph) image to public/og.png at 1200×630.
// Uses the Atlas palette and a globe motif; text uses a generic serif since
// librsvg (via sharp) only sees system fonts — fine for a share card.
// Run: npm run og   (also part of npm run data)

import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const BG = "#f5efe2";
const INK = "#221a0f";
const MUTED = "#82755c";
const ACCENT = "#bc5127";
const LINE = "#efe6d0";

// Globe: sphere + graticule-ish arcs, echoing the favicon.
const cx = 300;
const cy = 315;
const r = 170;
const globe = `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${ACCENT}"/>
  <g stroke="${BG}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.9">
    <line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}"/>
    <path d="M${cx} ${cy - r} C ${cx + 95} ${cy - r + 60}, ${cx + 95} ${cy + r - 60}, ${cx} ${cy + r}"/>
    <path d="M${cx} ${cy - r} C ${cx - 95} ${cy - r + 60}, ${cx - 95} ${cy + r - 60}, ${cx} ${cy + r}"/>
    <path d="M${cx} ${cy - r} C ${cx + 45} ${cy - r + 55}, ${cx + 45} ${cy + r - 55}, ${cx} ${cy + r}"/>
    <path d="M${cx} ${cy - r} C ${cx - 45} ${cy - r + 55}, ${cx - 45} ${cy + r - 55}, ${cx} ${cy + r}"/>
    <path d="M${cx - r + 22} ${cy - 92} H ${cx + r - 22}"/>
    <path d="M${cx - r + 22} ${cy + 92} H ${cx + r - 22}"/>
  </g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${BG}"/>
  <rect x="20" y="20" width="1160" height="590" rx="28" fill="none" stroke="${LINE}" stroke-width="2"/>
  ${globe}
  <g font-family="Georgia, 'Times New Roman', serif">
    <text x="558" y="250" font-size="44" fill="${ACCENT}" letter-spacing="6">KNOW THE WORLD</text>
    <text x="554" y="358" font-size="84" font-weight="700" fill="${INK}">One country</text>
    <text x="554" y="446" font-size="84" font-weight="700" fill="${INK}">at a time.</text>
    <text x="558" y="524" font-size="28" fill="${MUTED}" font-family="Arial, sans-serif">Flags · capitals · maps · quiz · 5 languages</text>
  </g>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(path.join(ROOT, "public/og.png"));
console.log("OG image → public/og.png (1200×630)");
