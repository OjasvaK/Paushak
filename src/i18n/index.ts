import en from "./en.json";
import hi from "./hi.json";

// `en` is the reference shape; `hi` must provide every key `en` has.
export type Dictionary = typeof en;

const dictionaries: Record<"en" | "hi", Dictionary> = { en, hi };

export type Locale = keyof typeof dictionaries;

export const locales = Object.keys(dictionaries) as Locale[];

export const defaultLocale: Locale = "en";

export function hasLocale(value: string): value is Locale {
  return value in dictionaries;
}

export function getDictionary(locale: Locale = defaultLocale): Dictionary {
  return dictionaries[locale];
}
