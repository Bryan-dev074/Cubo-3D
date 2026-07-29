import type { Locale } from "./types";

const supportedLocales: readonly Locale[] = ["es", "pt"];

export function detectLocale(
  stored: string | null,
  browserLanguages: readonly string[],
): Locale {
  if (stored !== null && supportedLocales.includes(stored as Locale)) {
    return stored as Locale;
  }

  return browserLanguages.some((language) => language.toLowerCase().startsWith("pt"))
    ? "pt"
    : "es";
}
