import type { Country, Lang } from "./types";
import { countryName } from "./i18n";

export type SortKey = "name" | "capital" | "population" | "area" | "density";
export type SortDir = "asc" | "desc";

const SORT_KEY = "ktw-sort-v1";

export function density(c: Country): number | null {
  return c.population && c.area ? c.population / c.area : null;
}

/** Sorts a copy of `list`. Countries missing the sorted value always end up
    last (in both directions) rather than bubbling to the top as 0/""; ties
    fall back to the localized country name so the order is never arbitrary. */
export function sortCountries(
  list: Country[],
  key: SortKey,
  dir: SortDir,
  lang: Lang,
): Country[] {
  const collator = new Intl.Collator(lang);
  const sign = dir === "asc" ? 1 : -1;

  const value = (c: Country): string | number | null => {
    switch (key) {
      case "name":
        return countryName(c, lang);
      case "capital":
        return c.capital[lang] ?? c.capital.en;
      case "population":
        return c.population;
      case "area":
        return c.area;
      case "density":
        return density(c);
    }
  };

  return [...list].sort((a, b) => {
    const byName = (): number => collator.compare(countryName(a, lang), countryName(b, lang));
    const va = value(a);
    const vb = value(b);
    if (va == null && vb == null) return byName();
    if (va == null) return 1;
    if (vb == null) return -1;
    const cmp =
      typeof va === "string" && typeof vb === "string"
        ? collator.compare(va, vb)
        : (va as number) - (vb as number);
    return cmp !== 0 ? cmp * sign : byName();
  });
}

export function loadSort(): { key: SortKey; dir: SortDir } {
  const keys: SortKey[] = ["name", "capital", "population", "area", "density"];
  try {
    const [key, dir] = (localStorage.getItem(SORT_KEY) ?? "").split(":");
    if (keys.includes(key as SortKey) && (dir === "asc" || dir === "desc")) {
      return { key: key as SortKey, dir };
    }
  } catch {
    /* fall through to the default */
  }
  return { key: "name", dir: "asc" };
}

export function saveSort(key: SortKey, dir: SortDir): void {
  localStorage.setItem(SORT_KEY, `${key}:${dir}`);
}
