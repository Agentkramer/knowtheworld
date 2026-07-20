import "@fontsource-variable/fraunces";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./style.css";
import "./themes.css";

import countriesJson from "./data/countries.json";
import worldMapJson from "./data/world-map.json";
import type { Country, Lang, WorldMap } from "./types";
import { LANGS, countryName, currencyNames, formatNumber, formatYear, languageNames, regionName, t } from "./i18n";
import { Deck } from "./deck";
import { MapView } from "./map";
import { loadScore, makeQuestion, recordAnswer, type Question } from "./quiz";

const countries = countriesJson as unknown as Country[];
const worldMap = worldMapJson as unknown as WorldMap;
const byCca3 = new Map(countries.map((c) => [c.cca3, c]));

const LANG_KEY = "ktw-lang";
const THEME_KEY = "ktw-theme";
const THEMES = ["atlas", "swiss", "dark", "vintage"];

// --- state ---------------------------------------------------------------

function initialLang(): Lang {
  const stored = localStorage.getItem(LANG_KEY);
  if (stored && (LANGS as string[]).includes(stored)) return stored as Lang;
  const nav = navigator.language.slice(0, 2).toLowerCase();
  return (LANGS as string[]).includes(nav) ? (nav as Lang) : "en";
}

let lang: Lang = initialLang();
let current: Country | null = null;
let mode: "explore" | "quiz" = "explore";
let question: Question | null = null;
let answered = false;
let score = loadScore();
const deck = new Deck(countries.map((c) => c.cca3));

// --- dom -----------------------------------------------------------------

const app = document.getElementById("app")!;
const searchInput = document.getElementById("search-input") as HTMLInputElement;
const searchResults = document.getElementById("search-results") as HTMLUListElement;
const langSelect = document.getElementById("lang-select") as HTMLSelectElement;
const themeSelect = document.getElementById("theme-select") as HTMLSelectElement;
const randomBtn = document.getElementById("random-btn") as HTMLButtonElement;
const randomLabel = document.getElementById("random-label")!;
const modeBtn = document.getElementById("mode-btn") as HTMLButtonElement;
const progressEl = document.getElementById("progress")!;

app.innerHTML = `
  <article class="country" id="country-view">
    <p class="overline" id="c-region"></p>
    <h1 class="country-name" id="c-name"></h1>
    <p class="subline"><span class="native" id="c-native"></span><span class="official" id="c-official"></span></p>
    <div class="panels">
      <figure class="flag-card"><img id="c-flag" alt="" /></figure>
      <div class="map-card" id="map-container"></div>
    </div>
    <dl class="stats" id="c-stats"></dl>
    <section class="neighbors" id="c-neighbors"></section>
  </article>
  <section class="quiz" id="quiz-view" hidden>
    <p class="overline quiz-prompt" id="q-prompt"></p>
    <div class="quiz-media">
      <figure class="flag-card quiz-flag" id="q-flag-card"><img id="q-flag" alt="" /></figure>
      <div class="map-card quiz-map" id="q-map-container" hidden></div>
    </div>
    <div class="quiz-options" id="q-options"></div>
    <p class="quiz-feedback" id="q-feedback"></p>
  </section>
`;

const view = document.getElementById("country-view")!;
const quizView = document.getElementById("quiz-view")!;
const mapView = new MapView(document.getElementById("map-container")!, worldMap);
const quizMap = new MapView(document.getElementById("q-map-container")!, worldMap);

// --- rendering -----------------------------------------------------------

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function stat(label: string, value: string | null, cls = ""): string {
  if (!value) return "";
  return `<div class="stat ${cls}"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
}

function render(c: Country): void {
  const name = countryName(c, lang);
  document.title = `${name} — Know the World`;

  document.getElementById("c-region")!.textContent = [
    regionName(lang, c.region),
    c.subregion ? regionName(lang, c.subregion) : null,
  ]
    .filter(Boolean)
    .join(" · ");

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

  const density =
    c.population && c.area ? `${formatNumber(lang, Math.round(c.population / c.area))} /km²` : null;

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

  updateBar();

  // retrigger entrance animation
  view.classList.remove("enter");
  void view.offsetWidth;
  view.classList.add("enter");
}

function updateBar(): void {
  if (mode === "explore") {
    randomLabel.textContent = t(lang, "random");
    modeBtn.textContent = t(lang, "quiz");
    progressEl.textContent = t(lang, "seen", { n: deck.seenCount, total: deck.total });
  } else {
    randomLabel.textContent = t(lang, "next");
    modeBtn.textContent = t(lang, "explore");
    const streak = score.streak > 1 ? ` · 🔥 ${score.streak}` : "";
    progressEl.textContent = `✓ ${score.correct} / ${score.total}${streak}`;
  }
}

// --- quiz ----------------------------------------------------------------

function optionLabel(c: Country): string {
  return question?.kind === "capital"
    ? (c.capital[lang] ?? c.capital.en ?? "—")
    : countryName(c, lang);
}

function renderQuestion(fresh: boolean): void {
  if (fresh || !question) {
    question = makeQuestion(countries, question?.answer.cca3 ?? null);
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
}

function setMode(m: "explore" | "quiz"): void {
  mode = m;
  view.hidden = m === "quiz";
  quizView.hidden = m === "explore";
  if (m === "quiz") {
    history.replaceState(null, "", "#quiz");
    renderQuestion(false);
  } else {
    if (current) {
      history.replaceState(null, "", `#${current.cca3.toLowerCase()}`);
      render(current);
    } else {
      showRandom();
    }
  }
  updateBar();
}

function applyStaticStrings(): void {
  searchInput.placeholder = t(lang, "searchPlaceholder");
  searchInput.setAttribute("aria-label", t(lang, "searchPlaceholder"));
  randomLabel.textContent = t(lang, "random");
  langSelect.setAttribute("aria-label", t(lang, "language"));
  themeSelect.setAttribute("aria-label", t(lang, "theme"));
  document.documentElement.lang = lang;
}

// --- navigation ----------------------------------------------------------

function show(code: string, updateHash = true): void {
  const c = byCca3.get(code.toUpperCase());
  if (!c) return;
  if (mode === "quiz") {
    mode = "explore";
    view.hidden = false;
    quizView.hidden = true;
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
  } else if (byCca3.has(code)) {
    show(code, false);
  }
});

randomBtn.addEventListener("click", () => {
  if (mode === "quiz") renderQuestion(true);
  else showRandom();
});

modeBtn.addEventListener("click", () => setMode(mode === "quiz" ? "explore" : "quiz"));

window.addEventListener("keydown", (e) => {
  const target = e.target as HTMLElement;
  if (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA") return;
  if (e.code === "Space" || e.key.toLowerCase() === "r") {
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
  const scored = countries
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

// neighbor chips + quiz options (delegated — these re-render constantly)
app.addEventListener("click", (e) => {
  const el = e.target as HTMLElement;
  const chip = el.closest(".chip[data-code]");
  if (chip) show(chip.getAttribute("data-code")!);
  const option = el.closest<HTMLButtonElement>(".quiz-option[data-idx]");
  if (option && !option.disabled) answerQuestion(Number(option.dataset.idx));
});

// --- language & theme ----------------------------------------------------

langSelect.value = lang;
langSelect.addEventListener("change", () => {
  lang = langSelect.value as Lang;
  localStorage.setItem(LANG_KEY, lang);
  applyStaticStrings();
  if (mode === "quiz") renderQuestion(true);
  else if (current) render(current);
});

const storedTheme = localStorage.getItem(THEME_KEY);
if (storedTheme && THEMES.includes(storedTheme)) {
  document.documentElement.dataset.theme = storedTheme;
}
themeSelect.value = document.documentElement.dataset.theme ?? "atlas";
themeSelect.addEventListener("change", () => {
  document.documentElement.dataset.theme = themeSelect.value;
  localStorage.setItem(THEME_KEY, themeSelect.value);
});

// --- boot ----------------------------------------------------------------

applyStaticStrings();
const initial = location.hash.slice(1).toUpperCase();
if (initial === "QUIZ") {
  setMode("quiz");
} else if (byCca3.has(initial)) {
  show(initial, false);
} else {
  showRandom();
}
