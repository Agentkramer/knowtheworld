import type { Country, Lang } from "./types";

export const LANGS: Lang[] = ["en", "de", "fr", "it", "es"];

interface UiStrings {
  searchPlaceholder: string;
  random: string;
  capital: string;
  population: string;
  area: string;
  density: string;
  government: string;
  founded: string;
  languages: string;
  currency: string;
  callingCode: string;
  neighbors: string;
  seen: string; // "{n}" and "{total}" placeholders
  bce: string;
  flagOf: string; // "{name}" placeholder
  officialName: string;
  theme: string;
  language: string;
  quiz: string;
  explore: string;
  next: string;
  qFlag: string;
  qCapital: string; // "{name}" placeholder
  qMap: string;
  correct: string;
  wrong: string; // "{answer}" placeholder
  showCountry: string;
  streak: string;
  reset: string;
  zoomWorld: string;
  zoomContinent: string;
  zoomRegion: string;
  list: string;
  country: string;
  allRegions: string;
  imprint: string;
  privacy: string;
  intro: string;
  score: string;
}

export const STRINGS: Record<Lang, UiStrings> = {
  en: {
    searchPlaceholder: "Search a country…",
    random: "Surprise me",
    capital: "Capital",
    population: "Population",
    area: "Area",
    density: "Density",
    government: "Government",
    founded: "Founded",
    languages: "Languages",
    currency: "Currency",
    callingCode: "Calling code",
    neighbors: "Neighbours",
    seen: "{n} of {total} seen",
    bce: "BCE",
    flagOf: "Flag of {name}",
    officialName: "Official name",
    theme: "Theme",
    language: "Language",
    quiz: "Quiz",
    explore: "Explore",
    next: "Next",
    qFlag: "Which country does this flag belong to?",
    qCapital: "What is the capital of {name}?",
    qMap: "Which country is highlighted?",
    correct: "Correct!",
    wrong: "Not quite — it's {answer}.",
    showCountry: "Show country",
    streak: "streak",
    reset: "Reset counter",
    zoomWorld: "World",
    zoomContinent: "Continent",
    zoomRegion: "Region",
    list: "List",
    country: "Country",
    allRegions: "All",
    imprint: "Imprint",
    privacy: "Privacy",
    intro:
      "Every visit shows a random country — flag, capital and where it sits on the map. Browse the full list or test yourself in the quiz.",
    score: "Score",
  },
  de: {
    searchPlaceholder: "Land suchen…",
    random: "Überrasch mich",
    capital: "Hauptstadt",
    population: "Einwohner",
    area: "Fläche",
    density: "Dichte",
    government: "Staatsform",
    founded: "Gegründet",
    languages: "Sprachen",
    currency: "Währung",
    callingCode: "Vorwahl",
    neighbors: "Nachbarländer",
    seen: "{n} von {total} gesehen",
    bce: "v. Chr.",
    flagOf: "Flagge von {name}",
    officialName: "Offizieller Name",
    theme: "Design",
    language: "Sprache",
    quiz: "Quiz",
    explore: "Entdecken",
    next: "Weiter",
    qFlag: "Zu welchem Land gehört diese Flagge?",
    qCapital: "Wie heißt die Hauptstadt von {name}?",
    qMap: "Welches Land ist markiert?",
    correct: "Richtig!",
    wrong: "Leider nein – richtig ist {answer}.",
    showCountry: "Land ansehen",
    streak: "Serie",
    reset: "Zähler zurücksetzen",
    zoomWorld: "Welt",
    zoomContinent: "Kontinent",
    zoomRegion: "Region",
    list: "Liste",
    country: "Land",
    allRegions: "Alle",
    imprint: "Impressum",
    privacy: "Datenschutz",
    intro:
      "Jeder Besuch zeigt ein zufälliges Land — mit Flagge, Hauptstadt und Lage auf der Karte. Stöbere in der Liste oder teste dich im Quiz.",
    score: "Punkte",
  },
  fr: {
    searchPlaceholder: "Rechercher un pays…",
    random: "Surprends-moi",
    capital: "Capitale",
    population: "Population",
    area: "Superficie",
    density: "Densité",
    government: "Régime politique",
    founded: "Fondation",
    languages: "Langues",
    currency: "Monnaie",
    callingCode: "Indicatif",
    neighbors: "Pays voisins",
    seen: "{n} sur {total} vus",
    bce: "av. J.-C.",
    flagOf: "Drapeau de {name}",
    officialName: "Nom officiel",
    theme: "Thème",
    language: "Langue",
    quiz: "Quiz",
    explore: "Explorer",
    next: "Suivant",
    qFlag: "À quel pays appartient ce drapeau ?",
    qCapital: "Quelle est la capitale de {name} ?",
    qMap: "Quel pays est mis en évidence ?",
    correct: "Exact !",
    wrong: "Raté — c'était {answer}.",
    showCountry: "Voir le pays",
    streak: "série",
    reset: "Réinitialiser le compteur",
    zoomWorld: "Monde",
    zoomContinent: "Continent",
    zoomRegion: "Région",
    list: "Liste",
    country: "Pays",
    allRegions: "Tous",
    imprint: "Mentions légales",
    privacy: "Confidentialité",
    intro:
      "Chaque visite affiche un pays au hasard — drapeau, capitale et position sur la carte. Parcourez la liste ou testez-vous au quiz.",
    score: "Score",
  },
  it: {
    searchPlaceholder: "Cerca un paese…",
    random: "Sorprendimi",
    capital: "Capitale",
    population: "Popolazione",
    area: "Superficie",
    density: "Densità",
    government: "Forma di governo",
    founded: "Fondazione",
    languages: "Lingue",
    currency: "Valuta",
    callingCode: "Prefisso",
    neighbors: "Paesi confinanti",
    seen: "{n} su {total} visti",
    bce: "a.C.",
    flagOf: "Bandiera di {name}",
    officialName: "Nome ufficiale",
    theme: "Tema",
    language: "Lingua",
    quiz: "Quiz",
    explore: "Esplora",
    next: "Avanti",
    qFlag: "A quale paese appartiene questa bandiera?",
    qCapital: "Qual è la capitale di {name}?",
    qMap: "Quale paese è evidenziato?",
    correct: "Giusto!",
    wrong: "No — era {answer}.",
    showCountry: "Vedi il paese",
    streak: "serie",
    reset: "Azzera il contatore",
    zoomWorld: "Mondo",
    zoomContinent: "Continente",
    zoomRegion: "Regione",
    list: "Elenco",
    country: "Paese",
    allRegions: "Tutti",
    imprint: "Note legali",
    privacy: "Privacy",
    intro:
      "Ogni visita mostra un paese a caso — bandiera, capitale e posizione sulla mappa. Sfoglia l'elenco o mettiti alla prova con il quiz.",
    score: "Punteggio",
  },
  es: {
    searchPlaceholder: "Buscar un país…",
    random: "Sorpréndeme",
    capital: "Capital",
    population: "Población",
    area: "Superficie",
    density: "Densidad",
    government: "Forma de gobierno",
    founded: "Fundación",
    languages: "Idiomas",
    currency: "Moneda",
    callingCode: "Prefijo",
    neighbors: "Países vecinos",
    seen: "{n} de {total} vistos",
    bce: "a. C.",
    flagOf: "Bandera de {name}",
    officialName: "Nombre oficial",
    theme: "Tema",
    language: "Idioma",
    quiz: "Quiz",
    explore: "Explorar",
    next: "Siguiente",
    qFlag: "¿A qué país pertenece esta bandera?",
    qCapital: "¿Cuál es la capital de {name}?",
    qMap: "¿Qué país está resaltado?",
    correct: "¡Correcto!",
    wrong: "No — era {answer}.",
    showCountry: "Ver el país",
    streak: "racha",
    reset: "Reiniciar el contador",
    zoomWorld: "Mundo",
    zoomContinent: "Continente",
    zoomRegion: "Región",
    list: "Lista",
    country: "País",
    allRegions: "Todos",
    imprint: "Aviso legal",
    privacy: "Privacidad",
    intro:
      "Cada visita muestra un país al azar — bandera, capital y su lugar en el mapa. Explora la lista o ponte a prueba con el quiz.",
    score: "Puntuación",
  },
};

type RegionMap = Record<string, Partial<Record<Lang, string>>>;

const REGIONS: RegionMap = {
  Africa: { de: "Afrika", fr: "Afrique", it: "Africa", es: "África" },
  Americas: { de: "Amerika", fr: "Amériques", it: "Americhe", es: "América" },
  Asia: { de: "Asien", fr: "Asie", it: "Asia", es: "Asia" },
  Europe: { de: "Europa", fr: "Europe", it: "Europa", es: "Europa" },
  Oceania: { de: "Ozeanien", fr: "Océanie", it: "Oceania", es: "Oceanía" },
  "Southern Asia": { de: "Südasien", fr: "Asie du Sud", it: "Asia meridionale", es: "Asia meridional" },
  "Southeast Europe": {
    de: "Südosteuropa",
    fr: "Europe du Sud-Est",
    it: "Europa sudorientale",
    es: "Europa sudoriental",
  },
  "Northern Africa": { de: "Nordafrika", fr: "Afrique du Nord", it: "Nordafrica", es: "África del Norte" },
  "Southern Europe": { de: "Südeuropa", fr: "Europe du Sud", it: "Europa meridionale", es: "Europa meridional" },
  "Middle Africa": { de: "Zentralafrika", fr: "Afrique centrale", it: "Africa centrale", es: "África central" },
  Caribbean: { de: "Karibik", fr: "Caraïbes", it: "Caraibi", es: "Caribe" },
  "South America": { de: "Südamerika", fr: "Amérique du Sud", it: "Sudamerica", es: "América del Sur" },
  "Western Asia": { de: "Westasien", fr: "Asie de l'Ouest", it: "Asia occidentale", es: "Asia occidental" },
  "Australia and New Zealand": {
    de: "Australien und Neuseeland",
    fr: "Australie et Nouvelle-Zélande",
    it: "Australia e Nuova Zelanda",
    es: "Australia y Nueva Zelanda",
  },
  "Central Europe": { de: "Mitteleuropa", fr: "Europe centrale", it: "Europa centrale", es: "Europa central" },
  "Eastern Europe": { de: "Osteuropa", fr: "Europe de l'Est", it: "Europa orientale", es: "Europa oriental" },
  "Western Europe": { de: "Westeuropa", fr: "Europe de l'Ouest", it: "Europa occidentale", es: "Europa occidental" },
  "Central America": { de: "Mittelamerika", fr: "Amérique centrale", it: "America centrale", es: "América Central" },
  "Western Africa": { de: "Westafrika", fr: "Afrique de l'Ouest", it: "Africa occidentale", es: "África occidental" },
  "Southern Africa": { de: "Südliches Afrika", fr: "Afrique australe", it: "Africa australe", es: "África austral" },
  "South-Eastern Asia": { de: "Südostasien", fr: "Asie du Sud-Est", it: "Sud-est asiatico", es: "Sudeste asiático" },
  "Eastern Africa": { de: "Ostafrika", fr: "Afrique de l'Est", it: "Africa orientale", es: "África oriental" },
  "North America": { de: "Nordamerika", fr: "Amérique du Nord", it: "America del Nord", es: "América del Norte" },
  "Eastern Asia": { de: "Ostasien", fr: "Asie de l'Est", it: "Asia orientale", es: "Asia oriental" },
  "Northern Europe": { de: "Nordeuropa", fr: "Europe du Nord", it: "Europa settentrionale", es: "Europa septentrional" },
  Melanesia: { de: "Melanesien", fr: "Mélanésie", it: "Melanesia", es: "Melanesia" },
  "Central Asia": { de: "Zentralasien", fr: "Asie centrale", it: "Asia centrale", es: "Asia central" },
  Micronesia: { de: "Mikronesien", fr: "Micronésie", it: "Micronesia", es: "Micronesia" },
  Polynesia: { de: "Polynesien", fr: "Polynésie", it: "Polinesia", es: "Polinesia" },
};

export const LANG_META: Record<Lang, { label: string; flag: string }> = {
  en: { label: "English", flag: "gb" },
  de: { label: "Deutsch", flag: "de" },
  fr: { label: "Français", flag: "fr" },
  it: { label: "Italiano", flag: "it" },
  es: { label: "Español", flag: "es" },
};

export function t(lang: Lang, key: keyof UiStrings, vars?: Record<string, string | number>): string {
  let s = STRINGS[lang][key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

export function regionName(lang: Lang, region: string): string {
  return REGIONS[region]?.[lang] ?? region;
}

export function countryName(c: Country, lang: Lang): string {
  return c.name[lang] ?? c.name.en;
}

export function formatNumber(lang: Lang, n: number): string {
  return new Intl.NumberFormat(lang).format(n);
}

export function formatYear(lang: Lang, year: number): string {
  return year < 0 ? `${formatNumber(lang, Math.abs(year))} ${t(lang, "bce")}` : String(year);
}

export function languageNames(lang: Lang, codes: Record<string, string>): string {
  let dn: Intl.DisplayNames | null = null;
  try {
    dn = new Intl.DisplayNames([lang], { type: "language", fallback: "none" });
  } catch {
    /* environment without DisplayNames — fall back to English names */
  }
  return Object.entries(codes)
    .map(([code, enName]) => {
      try {
        return dn?.of(code) ?? enName;
      } catch {
        return enName;
      }
    })
    .join(", ");
}

export function currencyNames(lang: Lang, codes: string[]): string {
  let dn: Intl.DisplayNames | null = null;
  try {
    dn = new Intl.DisplayNames([lang], { type: "currency", fallback: "none" });
  } catch {
    /* fall back to bare codes */
  }
  return codes
    .map((code) => {
      try {
        const name = dn?.of(code);
        return name && name !== code ? `${name} (${code})` : code;
      } catch {
        return code;
      }
    })
    .join(", ");
}
