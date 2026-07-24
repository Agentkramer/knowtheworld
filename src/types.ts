export type Lang = "en" | "de" | "fr" | "it" | "es";

export interface Localized {
  en: string | null;
  de: string | null;
  fr: string | null;
  it: string | null;
  es: string | null;
}

export interface Country {
  cca2: string;
  cca3: string;
  ccn3: string | null;
  name: Localized & { en: string; native: string; official: string };
  capital: Localized;
  region: string;
  subregion: string | null;
  area: number;
  population: number | null;
  founded: number | null;
  government: Localized;
  latlng: [number, number];
  borders: string[];
  languages: Record<string, string>;
  currencies: string[];
  callingCode: string | null;
  wikipedia: Localized;
  territory: boolean;
  note: Localized | null;
}

export interface MapVariant {
  sphere: string;
  graticule: string;
  // id null = neutral land (drawn, but not highlightable or clickable)
  countries: { id: string | null; d: string }[];
  points: Record<string, [number, number]>;
}

export interface WorldMap {
  viewBox: string;
  width: number;
  height: number;
  standard: MapVariant;
  pacific: MapVariant;
}
