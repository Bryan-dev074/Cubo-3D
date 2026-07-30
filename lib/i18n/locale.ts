import type { Locale } from "./types";

const supportedLocales: readonly Locale[] = ["es", "pt"];

export function detectLocale(
  stored: string | null,
  browserLanguages: readonly string[],
): Locale {
  if (stored !== null && supportedLocales.includes(stored as Locale)) {
    return stored as Locale;
  }

  for (const language of browserLanguages) {
    const normalized = language.toLowerCase();
    const supported = supportedLocales.find(
      (locale) =>
        normalized === locale || normalized.startsWith(`${locale}-`),
    );
    if (supported) {
      return supported;
    }
  }

  return "es";
}
