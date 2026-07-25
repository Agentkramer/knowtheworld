import "@fontsource-variable/fraunces";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./style.css";
import "./themes.css";

import countriesJson from "./data/countries.json";
import worldMapJson from "./data/world-map.json";
import metaJson from "./data/meta.json";
import type { Country, Lang, WorldMap } from "./types";
import {
  LANGS,
  LANG_META,
  countryName,
  currencyNames,
  formatNumber,
  formatYear,
  languageNames,
  regionName,
  t,
} from "./i18n";
import { Deck } from "./deck";
import { MapView, type ZoomLevel } from "./map";
import { loadScore, makeQuestion, recordAnswer, resetScore, type Question } from "./quiz";
import { density, loadSort, saveSort, sortCountries, type SortDir, type SortKey } from "./list";

const all = countriesJson as unknown as Country[];
// Territories are full participants: browsing, the random deck, the list, the
// counter and the quiz.
const worldMap = worldMapJson as unknown as WorldMap;
const byCca3 = new Map(all.map((c) => [c.cca3, c]));

const LANG_KEY = "ktw-lang";
const THEME_KEY = "ktw-theme";
const ZOOM_KEY = "ktw-zoom";
// Swatch colours mirror the tokens in themes.css; keep them in sync when a
// theme's palette changes.
const THEME_META: { id: string; label: string; bg: string; ink: string; accent: string }[] = [
  { id: "atlas", label: "Atlas", bg: "#f5efe2", ink: "#221a0f", accent: "#bc5127" },
  { id: "swiss", label: "Swiss", bg: "#f1f0ec", ink: "#111111", accent: "#e8322a" },
  { id: "dark", label: "Nocturne", bg: "#0c1016", ink: "#e9edf4", accent: "#ffc94d" },
  { id: "vintage", label: "Vintage", bg: "#eadfc6", ink: "#3d2f1c", accent: "#8a5a33" },
];
const THEMES = THEME_META.map((t) => t.id);
const ZOOMS: ZoomLevel[] = ["world", "region", "subregion"];

const byRegion = new Map<string, string[]>();
const bySubregion = new Map<string, string[]>();
for (const c of all) {
  byRegion.set(c.region, [...(byRegion.get(c.region) ?? []), c.cca3]);
  if (c.subregion) bySubregion.set(c.subregion, [...(bySubregion.get(c.subregion) ?? []), c.cca3]);
}

// --- state ---------------------------------------------------------------

function initialLang(): Lang {
  const stored = localStorage.getItem(LANG_KEY);
  if (stored && (LANGS as string[]).includes(stored)) return stored as Lang;
  const nav = navigator.language.slice(0, 2).toLowerCase();
  return (LANGS as string[]).includes(nav) ? (nav as Lang) : "en";
}

function initialZoom(): ZoomLevel {
  const stored = localStorage.getItem(ZOOM_KEY);
  return stored && (ZOOMS as string[]).includes(stored) ? (stored as ZoomLevel) : "world";
}

let lang: Lang = initialLang();
let zoomLevel: ZoomLevel = initialZoom();
let current: Country | null = null;
type Mode = "explore" | "list" | "quiz";
let mode: Mode = "explore";
let question: Question | null = null;
let answered = false;
let score = loadScore();
const deck = new Deck(all.map((c) => c.cca3));

// --- dom -----------------------------------------------------------------

const app = document.getElementById("app")!;
const searchInput = document.getElementById("search-input") as HTMLInputElement;
const searchResults = document.getElementById("search-results") as HTMLUListElement;
const langPicker = document.getElementById("lang-picker")!;
const langButton = document.getElementById("lang-button") as HTMLButtonElement;
const langMenu = document.getElementById("lang-menu") as HTMLUListElement;
const themePicker = document.getElementById("theme-picker")!;
const themeButton = document.getElementById("theme-button") as HTMLButtonElement;
const themeMenu = document.getElementById("theme-menu") as HTMLUListElement;
const randomBtn = document.getElementById("random-btn") as HTMLButtonElement;
const randomLabel = document.getElementById("random-label")!;
const modeSwitch = document.getElementById("mode-switch")!;
const progressEl = document.getElementById("progress")!;
const resetBtn = document.getElementById("reset-btn") as HTMLButtonElement;

app.innerHTML = `
  <article class="country" id="country-view">
    <p class="overline" id="c-region"></p>
    <h1 class="country-name" id="c-name"></h1>
    <p class="subline"><span class="native" id="c-native"></span><span class="official" id="c-official"></span></p>
    <p class="status-note" id="c-note" hidden></p>
    <div class="panels">
      <figure class="flag-card"><img id="c-flag" alt="" /></figure>
      <div class="map-card" id="map-container"></div>
    </div>
    <dl class="stats" id="c-stats"></dl>
    <section class="neighbors" id="c-neighbors"></section>
    <p class="wiki-link"><a id="c-wiki" href="#" target="_blank" rel="noopener"></a></p>
  </article>
  <section class="quiz" id="quiz-view" hidden>
    <p class="overline quiz-prompt" id="q-prompt"></p>
    <div class="quiz-media">
      <figure class="flag-card quiz-flag" id="q-flag-card"><img id="q-flag" alt="" /></figure>
      <div class="map-card quiz-map" id="q-map-container" hidden></div>
    </div>
    <div class="quiz-options" id="q-options"></div>
    <p class="quiz-feedback" id="q-feedback"></p>
    <div class="quiz-footer">
      <button id="q-next" class="random-btn" type="button">
        <span id="q-next-label"></span>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h13M12.5 6l6 6-6 6" />
        </svg>
      </button>
      <p class="progress quiz-score">
        <span id="q-score"></span>
        <button id="q-reset" class="reset-btn" type="button">
          <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5"/>
            <path d="M3.5 3.5v5h5"/>
          </svg>
        </button>
      </p>
    </div>
  </section>
  <section class="list-view" id="list-view" hidden>
    <div class="list-filter" id="list-filter"></div>
    <div class="list-sort" id="list-sort"></div>
    <table class="country-table" id="country-table">
      <thead id="list-head"></thead>
      <tbody id="list-body"></tbody>
    </table>
  </section>
`;

const view = document.getElementById("country-view")!;
const quizView = document.getElementById("quiz-view")!;
const listView = document.getElementById("list-view")!;
const mapView = new MapView(document.getElementById("map-container")!, worldMap, {
  interactive: true,
  onSelect: (code) => show(code),
  getName: (code) => {
    const c = byCca3.get(code);
    return c ? countryName(c, lang) : "";
  },
});
const quizMap = new MapView(document.getElementById("q-map-container")!, worldMap);

// zoom control overlay on the explore map
const zoomCtrl = document.createElement("div");
zoomCtrl.className = "map-zoom-ctrl";
document.getElementById("map-container")!.appendChild(zoomCtrl);

function renderZoomCtrl(): void {
  const labels: Record<ZoomLevel, string> = {
    world: t(lang, "zoomWorld"),
    region: t(lang, "zoomContinent"),
    subregion: t(lang, "zoomRegion"),
  };
  zoomCtrl.innerHTML = ZOOMS.map(
    (z) =>
      `<button type="button" data-zoom="${z}" class="${z === zoomLevel ? "active" : ""}">${labels[z]}</button>`,
  ).join("");
}

zoomCtrl.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("[data-zoom]");
  if (!btn) return;
  zoomLevel = btn.getAttribute("data-zoom") as ZoomLevel;
  localStorage.setItem(ZOOM_KEY, zoomLevel);
  renderZoomCtrl();
  applyZoom();
});

function applyZoom(): void {
  if (!current) return;
  const members =
    zoomLevel === "subregion" && current.subregion
      ? (bySubregion.get(current.subregion) ?? [])
      : zoomLevel !== "world"
        ? (byRegion.get(current.region) ?? [])
        : [];
  mapView.setZoom(zoomLevel === "world" ? "world" : zoomLevel, members);
}

// --- rendering -----------------------------------------------------------

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Sparse territories (Greenland ~0.03) would round to a misleading "0";
// show "< 1" instead once the rounded value drops below 1.
function densityValue(raw: number): string {
  return Math.round(raw) < 1 ? "< 1" : formatNumber(lang, Math.round(raw));
}

function stat(label: string, value: string | null, cls = ""): string {
  if (!value) return "";
  return `<div class="stat ${cls}"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
}

function render(c: Country): void {
  const name = countryName(c, lang);
  document.title = `${name} — Know the World`;

  const regionEl = document.getElementById("c-region")!;
  regionEl.textContent = [
    c.territory ? t(lang, "territory") : null,
    regionName(lang, c.region),
    c.subregion ? regionName(lang, c.subregion) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  regionEl.classList.toggle("is-territory", c.territory);

  const noteEl = document.getElementById("c-note")!;
  if (c.territory && c.note) {
    noteEl.textContent = c.note[lang] ?? c.note.en;
    noteEl.hidden = false;
  } else {
    noteEl.hidden = true;
  }

  const nameEl = document.getElementById("c-name")!;
  nameEl.textContent = name;
  nameEl.classList.toggle("long", name.length > 18);

  const native = c.name.native !== name ? c.name.native : "";
  document.getElementById("c-native")!.textContent = native;
  document.getElementById("c-official")!.textContent =
    c.name.official !== name ? c.name.official : "";

  const flag = document.getElementById("c-flag") as HTMLImageElement;
  flag.src = `${import.meta.env.BASE_URL}flags/${c.cca2.toLowerCase()}.svg`;
  flag.alt = t(lang, "flagOf", { name });

  mapView.highlight(c.cca3);
  applyZoom();

  const density =
    c.population && c.area ? `${densityValue(c.population / c.area)} /km²` : null;

  document.getElementById("c-stats")!.innerHTML = [
    stat(t(lang, "capital"), c.capital[lang] ?? c.capital.en, "stat-capital"),
    stat(t(lang, "population"), c.population ? formatNumber(lang, c.population) : null),
    stat(t(lang, "area"), `${formatNumber(lang, c.area)} km²`),
    stat(t(lang, "density"), density),
    stat(t(lang, "government"), c.government[lang] ?? c.government.en ?? "—"),
    stat(t(lang, "founded"), c.founded ? formatYear(lang, c.founded) : null),
    stat(t(lang, "languages"), languageNames(lang, c.languages)),
    stat(t(lang, "currency"), currencyNames(lang, c.currencies)),
    stat(t(lang, "callingCode"), c.callingCode),
  ].join("");

  const neighborsEl = document.getElementById("c-neighbors")!;
  if (c.borders.length) {
    const chips = c.borders
      .map((code) => byCca3.get(code))
      .filter((n): n is Country => !!n)
      .map(
        (n) => `<button class="chip" data-code="${n.cca3}">
          <img src="${import.meta.env.BASE_URL}flags/${n.cca2.toLowerCase()}.svg" alt="" loading="lazy" />
          <span>${esc(countryName(n, lang))}</span>
        </button>`,
      )
      .join("");
    neighborsEl.innerHTML = `<h2>${esc(t(lang, "neighbors"))}</h2><div class="chip-row">${chips}</div>`;
  } else {
    neighborsEl.innerHTML = "";
  }

  const wiki = document.getElementById("c-wiki") as HTMLAnchorElement;
  const wikiUrl = c.wikipedia[lang] ?? c.wikipedia.en;
  if (wikiUrl) {
    wiki.href = wikiUrl;
    wiki.textContent = `${t(lang, "wikipedia")} ↗`;
    wiki.parentElement!.hidden = false;
  } else {
    wiki.parentElement!.hidden = true;
  }

  updateBar();

  // retrigger entrance animation
  view.classList.remove("enter");
  void view.offsetWidth;
  view.classList.add("enter");
}

function updateBar(): void {
  // One position, one meaning: the toolbar always talks about countries seen,
  // and "Surprise me" always means "random country" — so it steps aside in the
  // quiz, which brings its own Next button and score.
  randomLabel.textContent = t(lang, "random");
  randomBtn.hidden = mode === "quiz";
  progressEl.textContent = t(lang, "seen", { n: deck.seenCount, total: deck.total });
  renderModeSwitch();
}

function updateQuizFooter(): void {
  document.getElementById("q-next-label")!.textContent = t(lang, "next");
  const streak = score.streak > 1 ? ` · 🔥 ${score.streak}` : "";
  document.getElementById("q-score")!.textContent =
    `✓ ${score.correct} / ${score.total}${streak}`;
  const reset = document.getElementById("q-reset")!;
  reset.setAttribute("title", t(lang, "reset"));
  reset.setAttribute("aria-label", t(lang, "reset"));
}

function renderModeSwitch(): void {
  const modes: [Mode, string][] = [
    ["explore", t(lang, "explore")],
    ["list", t(lang, "list")],
    ["quiz", t(lang, "quiz")],
  ];
  modeSwitch.innerHTML = modes
    .map(
      ([m, label]) =>
        `<button type="button" data-mode="${m}" class="${m === mode ? "active" : ""}">${esc(label)}</button>`,
    )
    .join("");
}

modeSwitch.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("[data-mode]");
  if (btn) setMode(btn.getAttribute("data-mode") as Mode);
});

// --- list view -----------------------------------------------------------

const savedSort = loadSort();
let sortKey: SortKey = savedSort.key;
let sortDir: SortDir = savedSort.dir;
let regionFilter: string | null = null;

function renderList(): void {
  document.title = `${t(lang, "list")} — Know the World`;

  const regions = [...byRegion.keys()].sort((a, b) =>
    regionName(lang, a).localeCompare(regionName(lang, b), lang),
  );
  document.getElementById("list-filter")!.innerHTML = [
    `<button type="button" data-region="" class="${regionFilter === null ? "active" : ""}">${esc(t(lang, "allRegions"))}</button>`,
    ...regions.map(
      (r) =>
        `<button type="button" data-region="${esc(r)}" class="${regionFilter === r ? "active" : ""}">${esc(regionName(lang, r))}</button>`,
    ),
  ].join("");

  // Units live in the column head, not in all 194 cells — shorter rows and
  // no wrapped "km²" fragments in the mono-spaced themes.
  const cols: { key: SortKey; label: string; numeric: boolean }[] = [
    { key: "name", label: t(lang, "country"), numeric: false },
    { key: "capital", label: t(lang, "capital"), numeric: false },
    { key: "population", label: t(lang, "population"), numeric: true },
    { key: "area", label: `${t(lang, "area")} (km²)`, numeric: true },
    { key: "density", label: `${t(lang, "density")} (/km²)`, numeric: true },
  ];

  // Same data-sort hooks as the table headers, so phones (where the header
  // row is replaced by cards) keep full sorting control.
  document.getElementById("list-sort")!.innerHTML = cols
    .map(
      (c) =>
        `<button type="button" data-sort="${c.key}" class="${c.key === sortKey ? "active" : ""}">${esc(c.label)}${
          c.key === sortKey ? ` ${sortDir === "asc" ? "▲" : "▼"}` : ""
        }</button>`,
    )
    .join("");

  document.getElementById("list-head")!.innerHTML =
    // The flag column is decorative — the country name sits right next to it.
    `<tr><th class="col-rank">#</th><th class="col-flag"></th>` +
    cols
      .map(
        (c) =>
          `<th data-sort="${c.key}" class="${c.numeric ? "num" : ""} ${c.key === sortKey ? "sorted" : ""}"
             aria-sort="${c.key === sortKey ? (sortDir === "asc" ? "ascending" : "descending") : "none"}">
             <span>${esc(c.label)}</span><span class="arrow">${c.key === sortKey ? (sortDir === "asc" ? "▲" : "▼") : ""}</span>
           </th>`,
      )
      .join("") +
    "</tr>";

  const pool = regionFilter ? all.filter((c) => c.region === regionFilter) : all;
  const rows = sortCountries(pool, sortKey, sortDir, lang);

  document.getElementById("list-body")!.innerHTML = rows
    .map((c, i) => {
      const d = density(c);
      return `<tr data-code="${c.cca3}">
        <td class="col-rank">${i + 1}</td>
        <td class="col-flag"><img src="${import.meta.env.BASE_URL}flags/${c.cca2.toLowerCase()}.svg" alt="" loading="lazy" /></td>
        <td class="col-name">${esc(countryName(c, lang))}${
          c.territory ? `<span class="territory-tag">${esc(t(lang, "territory"))}</span>` : ""
        }</td>
        <td data-label="${esc(t(lang, "capital"))}">${esc(c.capital[lang] ?? c.capital.en ?? "—")}</td>
        <td class="num" data-label="${esc(t(lang, "population"))}">${c.population ? formatNumber(lang, c.population) : "—"}</td>
        <td class="num" data-label="${esc(t(lang, "area"))} km²">${formatNumber(lang, c.area)}</td>
        <td class="num" data-label="${esc(t(lang, "density"))} /km²">${d ? densityValue(d) : "—"}</td>
      </tr>`;
    })
    .join("");
}

// --- quiz ----------------------------------------------------------------

function optionLabel(c: Country): string {
  return question?.kind === "capital"
    ? (c.capital[lang] ?? c.capital.en ?? "—")
    : countryName(c, lang);
}

function renderQuestion(fresh: boolean): void {
  if (fresh || !question) {
    question = makeQuestion(all, question?.answer.cca3 ?? null);
    answered = false;
  }
  const q = question;
  const name = countryName(q.answer, lang);
  document.title = `${t(lang, "quiz")} — Know the World`;

  document.getElementById("q-prompt")!.textContent =
    q.kind === "flag"
      ? t(lang, "qFlag")
      : q.kind === "capital"
        ? t(lang, "qCapital", { name })
        : t(lang, "qMap");

  const flagCard = document.getElementById("q-flag-card")!;
  const mapCard = document.getElementById("q-map-container")!;
  if (q.kind === "map") {
    flagCard.hidden = true;
    mapCard.hidden = false;
    quizMap.highlight(q.answer.cca3);
  } else {
    flagCard.hidden = false;
    mapCard.hidden = true;
    const img = document.getElementById("q-flag") as HTMLImageElement;
    img.src = `${import.meta.env.BASE_URL}flags/${q.answer.cca2.toLowerCase()}.svg`;
    img.alt = "";
  }

  document.getElementById("q-options")!.innerHTML = q.options
    .map(
      (c, i) => `<button class="quiz-option" data-idx="${i}" type="button">
        <span class="key" aria-hidden="true">${i + 1}</span>
        <span>${esc(optionLabel(c))}</span>
      </button>`,
    )
    .join("");
  document.getElementById("q-feedback")!.innerHTML = "";
  updateBar();
  updateQuizFooter();

  quizView.classList.remove("enter");
  void (quizView as HTMLElement).offsetWidth;
  quizView.classList.add("enter");
}

function answerQuestion(idx: number): void {
  if (!question || answered) return;
  answered = true;
  const q = question;
  const chosen = q.options[idx];
  const isCorrect = chosen === q.answer;
  score = recordAnswer(score, isCorrect);

  const buttons = document.querySelectorAll<HTMLButtonElement>(".quiz-option");
  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (q.options[i] === q.answer) btn.classList.add("correct");
    else if (i === idx) btn.classList.add("wrong");
  });

  const answerLabel =
    q.kind === "capital"
      ? `${optionLabel(q.answer)} (${countryName(q.answer, lang)})`
      : optionLabel(q.answer);
  document.getElementById("q-feedback")!.innerHTML =
    `<span class="${isCorrect ? "ok" : "ko"}">${esc(
      isCorrect ? t(lang, "correct") : t(lang, "wrong", { answer: answerLabel }),
    )}</span> <a href="#${q.answer.cca3.toLowerCase()}" class="goto-country">${esc(t(lang, "showCountry"))} →</a>`;
  updateBar();
  updateQuizFooter();
}

function setMode(m: Mode): void {
  mode = m;
  view.hidden = m !== "explore";
  quizView.hidden = m !== "quiz";
  listView.hidden = m !== "list";
  if (m === "quiz") {
    history.replaceState(null, "", "#quiz");
    renderQuestion(false);
  } else if (m === "list") {
    history.replaceState(null, "", "#liste");
    renderList();
    listView.classList.remove("enter");
    void (listView as HTMLElement).offsetWidth;
    listView.classList.add("enter");
  } else if (current) {
    history.replaceState(null, "", `#${current.cca3.toLowerCase()}`);
    render(current);
  } else {
    showRandom();
  }
  updateBar();
}

// "2026-07" → "July 2026" / "Juli 2026", localized to the active language.
function formatStamp(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m) return yearMonth;
  return new Intl.DateTimeFormat(lang, { year: "numeric", month: "long" }).format(
    new Date(y, m - 1, 1),
  );
}

function applyStaticStrings(): void {
  searchInput.placeholder = t(lang, "searchPlaceholder");
  searchInput.setAttribute("aria-label", t(lang, "searchPlaceholder"));
  randomLabel.textContent = t(lang, "random");
  document.getElementById("intro-text")!.textContent = `${t(lang, "intro")} `;
  const moreLink = document.getElementById("intro-more")!;
  moreLink.textContent = `${t(lang, "moreInfo")}…`;
  renderLangPicker();
  renderThemePicker();
  updateQuizFooter();
  document.getElementById("link-imprint")!.textContent = t(lang, "imprint");
  document.getElementById("link-privacy")!.textContent = t(lang, "privacy");
  document.getElementById("link-about")!.textContent = t(lang, "about");
  document.getElementById("data-stamp")!.textContent = t(lang, "dataAsOf", {
    date: formatStamp(metaJson.generatedAt),
  });
  resetBtn.title = t(lang, "reset");
  resetBtn.setAttribute("aria-label", t(lang, "reset"));
  renderZoomCtrl();
  renderModeSwitch();
  document.documentElement.lang = lang;
}

resetBtn.addEventListener("click", () => {
  deck.reset();
  if (current) deck.markSeen(current.cca3);
  updateBar();
});

document.getElementById("q-next")!.addEventListener("click", () => renderQuestion(true));

document.getElementById("q-reset")!.addEventListener("click", () => {
  score = resetScore();
  updateQuizFooter();
});

// --- navigation ----------------------------------------------------------

function show(code: string, updateHash = true): void {
  const c = byCca3.get(code.toUpperCase());
  if (!c) return;
  if (mode !== "explore") {
    mode = "explore";
    view.hidden = false;
    quizView.hidden = true;
    listView.hidden = true;
  } else if (c === current) {
    return;
  }
  current = c;
  deck.markSeen(c.cca3);
  if (updateHash) history.replaceState(null, "", `#${c.cca3.toLowerCase()}`);
  render(c);
}

function showRandom(): void {
  let code = deck.next();
  if (current && code === current.cca3) code = deck.next();
  show(code);
}

window.addEventListener("hashchange", () => {
  const code = location.hash.slice(1).toUpperCase();
  if (code === "QUIZ") {
    if (mode !== "quiz") setMode("quiz");
  } else if (code === "LISTE") {
    if (mode !== "list") setMode("list");
  } else if (byCca3.has(code)) {
    show(code, false);
  }
});

randomBtn.addEventListener("click", () => {
  if (mode === "quiz") renderQuestion(true);
  else showRandom();
});

window.addEventListener("keydown", (e) => {
  const target = e.target as HTMLElement;
  if (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA") return;
  if (e.code === "Space" || e.key.toLowerCase() === "r") {
    // In the list, Space must keep scrolling the page — hijacking it there
    // would break the one thing a long list needs most.
    if (e.code === "Space" && mode === "list") return;
    e.preventDefault();
    if (mode === "quiz") renderQuestion(true);
    else showRandom();
  } else if (mode === "quiz" && /^[1-4]$/.test(e.key)) {
    answerQuestion(Number(e.key) - 1);
  }
});

document.getElementById("brand")!.addEventListener("click", (e) => {
  e.preventDefault();
  if (mode === "quiz") setMode("explore");
  else showRandom();
});

// --- search --------------------------------------------------------------

let activeIndex = -1;
let matches: Country[] = [];

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function renderSearchResults(): void {
  if (!matches.length) {
    searchResults.hidden = true;
    searchResults.innerHTML = "";
    return;
  }
  searchResults.innerHTML = matches
    .map(
      (c, i) => `<li class="${i === activeIndex ? "active" : ""}" data-code="${c.cca3}">
        <img src="${import.meta.env.BASE_URL}flags/${c.cca2.toLowerCase()}.svg" alt="" />
        <span>${esc(countryName(c, lang))}</span>
      </li>`,
    )
    .join("");
  searchResults.hidden = false;
}

function updateSearch(): void {
  const q = norm(searchInput.value.trim());
  activeIndex = -1;
  if (q.length < 1) {
    matches = [];
    renderSearchResults();
    return;
  }
  const scored = all
    .map((c) => {
      const names = [c.name.en, c.name.de, c.name.fr, c.name.it, c.name.native].filter(
        (n): n is string => !!n,
      );
      let score = -1;
      for (const n of names) {
        const nn = norm(n);
        if (nn.startsWith(q)) score = Math.max(score, 2);
        else if (nn.includes(q)) score = Math.max(score, 1);
      }
      return { c, score };
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score || countryName(a.c, lang).localeCompare(countryName(b.c, lang)));
  matches = scored.slice(0, 8).map((x) => x.c);
  renderSearchResults();
}

function pick(code: string): void {
  show(code);
  searchInput.value = "";
  matches = [];
  renderSearchResults();
  searchInput.blur();
}

searchInput.addEventListener("input", updateSearch);
searchInput.addEventListener("focus", updateSearch);
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    if (!matches.length) return;
    activeIndex =
      e.key === "ArrowDown"
        ? (activeIndex + 1) % matches.length
        : (activeIndex - 1 + matches.length) % matches.length;
    renderSearchResults();
  } else if (e.key === "Enter") {
    const target = matches[activeIndex] ?? matches[0];
    if (target) pick(target.cca3);
  } else if (e.key === "Escape") {
    matches = [];
    renderSearchResults();
    searchInput.blur();
  }
});
searchResults.addEventListener("mousedown", (e) => {
  const li = (e.target as HTMLElement).closest("li[data-code]");
  if (li) pick(li.getAttribute("data-code")!);
});
document.addEventListener("click", (e) => {
  if (!(e.target as HTMLElement).closest("#search-box")) {
    matches = [];
    renderSearchResults();
  }
});

// neighbor chips, quiz options, list rows/headers (delegated — all of these
// re-render constantly)
app.addEventListener("click", (e) => {
  const el = e.target as HTMLElement;

  const chip = el.closest(".chip[data-code]");
  if (chip) show(chip.getAttribute("data-code")!);

  const option = el.closest<HTMLButtonElement>(".quiz-option[data-idx]");
  if (option && !option.disabled) answerQuestion(Number(option.dataset.idx));

  const row = el.closest("tr[data-code]");
  if (row) show(row.getAttribute("data-code")!);

  const th = el.closest("[data-sort]");
  if (th) {
    const key = th.getAttribute("data-sort") as SortKey;
    if (key === sortKey) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortKey = key;
      // Names read best A–Z, figures best largest-first.
      sortDir = key === "name" || key === "capital" ? "asc" : "desc";
    }
    saveSort(sortKey, sortDir);
    renderList();
  }

  const regionBtn = el.closest("[data-region]");
  if (regionBtn) {
    const r = regionBtn.getAttribute("data-region")!;
    regionFilter = r === "" ? null : r;
    renderList();
  }
});

// --- language & theme ----------------------------------------------------

function flagSrc(code: string): string {
  return `${import.meta.env.BASE_URL}flags/${code}.svg`;
}

// Both dropdowns share this behaviour: open/close, close on outside click,
// and full keyboard control. Items carry data-value — deliberately not
// data-theme, which the selectors in themes.css would pick up.
function setupPicker(
  root: HTMLElement,
  button: HTMLButtonElement,
  menu: HTMLUListElement,
  onSelect: (value: string) => void,
): void {
  const items = (): HTMLLIElement[] => [...menu.querySelectorAll<HTMLLIElement>("li[data-value]")];

  const setOpen = (open: boolean): void => {
    menu.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    if (open) {
      const sel = items().findIndex((li) => li.getAttribute("aria-selected") === "true");
      highlight(Math.max(0, sel));
    }
  };

  const highlight = (idx: number): void => {
    const list = items();
    list.forEach((li, i) => li.classList.toggle("active", i === idx));
    list[idx]?.scrollIntoView({ block: "nearest" });
  };

  const activeIdx = (): number => items().findIndex((li) => li.classList.contains("active"));

  // No stopPropagation: the document handlers must still see the click so an
  // open search dropdown closes.
  button.addEventListener("click", () => setOpen(Boolean(menu.hidden)));

  menu.addEventListener("click", (e) => {
    const li = (e.target as HTMLElement).closest("li[data-value]");
    if (!li) return;
    setOpen(false);
    onSelect(li.getAttribute("data-value")!);
  });

  menu.addEventListener("pointermove", (e) => {
    const li = (e.target as HTMLElement).closest("li[data-value]");
    if (li) highlight(items().indexOf(li as HTMLLIElement));
  });

  root.addEventListener("keydown", (e) => {
    const open = !menu.hidden;
    if (e.key === "Escape") {
      setOpen(false);
      button.focus();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return setOpen(true);
      const list = items();
      const step = e.key === "ArrowDown" ? 1 : -1;
      highlight((activeIdx() + step + list.length) % list.length);
    } else if (open && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      const li = items()[activeIdx()];
      if (li) {
        setOpen(false);
        button.focus();
        onSelect(li.getAttribute("data-value")!);
      }
    }
  });

  document.addEventListener("click", (e) => {
    if (!(e.target as HTMLElement).closest(`#${root.id}`)) setOpen(false);
  });
}

function renderLangPicker(): void {
  const meta = LANG_META[lang];
  (document.getElementById("lang-flag") as HTMLImageElement).src = flagSrc(meta.flag);
  document.getElementById("lang-code")!.textContent = lang.toUpperCase();
  langButton.setAttribute("aria-label", `${t(lang, "language")}: ${meta.label}`);
  langMenu.innerHTML = LANGS.map(
    (l) =>
      `<li role="option" data-value="${l}" aria-selected="${l === lang}">
         <img src="${flagSrc(LANG_META[l].flag)}" alt="" />
         <span>${esc(LANG_META[l].label)}</span>
       </li>`,
  ).join("");
}

function renderThemePicker(): void {
  const activeTheme = document.documentElement.dataset.theme ?? "atlas";
  const meta = THEME_META.find((m) => m.id === activeTheme) ?? THEME_META[0];
  const swatch = (m: (typeof THEME_META)[number]): string =>
    `<span class="swatch" aria-hidden="true" style="--s-bg:${m.bg};--s-ink:${m.ink};--s-accent:${m.accent}"></span>`;
  document.getElementById("theme-swatch")!.outerHTML = swatch(meta).replace(
    'class="swatch"',
    'class="swatch" id="theme-swatch"',
  );
  document.getElementById("theme-name")!.textContent = meta.label;
  themeButton.setAttribute("aria-label", `${t(lang, "theme")}: ${meta.label}`);
  themeMenu.innerHTML = THEME_META.map(
    (m) =>
      `<li role="option" data-value="${m.id}" aria-selected="${m.id === activeTheme}">
         ${swatch(m)}<span>${esc(m.label)}</span>
       </li>`,
  ).join("");
}

setupPicker(langPicker, langButton, langMenu, (value) => {
  lang = value as Lang;
  localStorage.setItem(LANG_KEY, lang);
  applyStaticStrings();
  if (mode === "quiz") renderQuestion(true);
  else if (mode === "list") renderList();
  else if (current) render(current);
});

setupPicker(themePicker, themeButton, themeMenu, (value) => {
  document.documentElement.dataset.theme = value;
  localStorage.setItem(THEME_KEY, value);
  renderThemePicker();
});

const storedTheme = localStorage.getItem(THEME_KEY);
if (storedTheme && THEMES.includes(storedTheme)) {
  document.documentElement.dataset.theme = storedTheme;
}

// --- boot ----------------------------------------------------------------

applyStaticStrings();
const initial = location.hash.slice(1).toUpperCase();
if (initial === "QUIZ") {
  setMode("quiz");
} else if (initial === "LISTE") {
  setMode("list");
} else if (byCca3.has(initial)) {
  show(initial, false);
} else {
  showRandom();
}
