// Standalone About page. Works without the app bundle but adopts the theme
// and language the visitor chose on the main site (via localStorage), and
// lets them switch language with chips.
import "@fontsource-variable/fraunces";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "./themes.css";
import "./legal.css";
import metaJson from "./data/meta.json";

const THEMES = ["atlas", "swiss", "dark", "vintage"];
const LANGS = ["en", "de", "fr", "it", "es"];

const storedTheme = localStorage.getItem("ktw-theme");
if (storedTheme && THEMES.includes(storedTheme)) {
  document.documentElement.dataset.theme = storedTheme;
}

function currentLang(): string {
  const stored = localStorage.getItem("ktw-lang");
  if (stored && LANGS.includes(stored)) return stored;
  const nav = navigator.language.slice(0, 2).toLowerCase();
  return LANGS.includes(nav) ? nav : "en";
}

function fillStamps(): void {
  for (const el of document.querySelectorAll<HTMLElement>(".about-stamp")) {
    const secLang = el.closest<HTMLElement>("[data-lang]")?.dataset.lang ?? "en";
    const [y, m] = metaJson.generatedAt.split("-").map(Number);
    el.textContent =
      y && m
        ? new Intl.DateTimeFormat(secLang, { year: "numeric", month: "long" }).format(
            new Date(y, m - 1, 1),
          )
        : metaJson.generatedAt;
  }
}

function show(lang: string): void {
  for (const sec of document.querySelectorAll<HTMLElement>("section[data-lang]")) {
    sec.hidden = sec.dataset.lang !== lang;
  }
  for (const chip of document.querySelectorAll<HTMLElement>(".lang-chip")) {
    chip.classList.toggle("active", chip.dataset.lang === lang);
  }
  document.documentElement.lang = lang;
}

fillStamps();
show(currentLang());

for (const chip of document.querySelectorAll<HTMLElement>(".lang-chip")) {
  chip.addEventListener("click", () => {
    const lang = chip.dataset.lang!;
    localStorage.setItem("ktw-lang", lang);
    show(lang);
  });
}
