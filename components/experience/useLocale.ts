"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import { detectLocale } from "@/lib/i18n/locale";
import type { Locale } from "@/lib/i18n/types";

export const LOCALE_STORAGE_KEY = "cubo3d-locale";
const LOCALE_CHANGE_EVENT = "cubo3d:locale-change";
let sessionLocale: Locale | null = null;

export function useLocale(): readonly [
  Locale,
  (nextLocale: Locale) => void,
] {
  const locale = useSyncExternalStore(
    subscribeToLocale,
    readClientLocale,
    readServerLocale,
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    sessionLocale = nextLocale;
    document.documentElement.lang = nextLocale;

    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
      sessionLocale = null;
    } catch {
      // Privacy-restricted browsing still keeps the explicit session choice.
    }
    window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
  }, []);

  return [locale, setLocale] as const;
}

function subscribeToLocale(onStoreChange: () => void): () => void {
  window.addEventListener(LOCALE_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(LOCALE_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function readClientLocale(): Locale {
  if (sessionLocale) {
    return sessionLocale;
  }

  const stored = readStoredLocale();
  const browserLanguages =
    navigator.languages.length > 0 ? navigator.languages : [navigator.language];
  return detectLocale(stored, browserLanguages);
}

function readServerLocale(): Locale {
  return "es";
}

function readStoredLocale(): string | null {
  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
}
