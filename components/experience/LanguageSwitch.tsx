"use client";

import type { Locale } from "@/lib/i18n/types";
import type { Dictionary } from "@/lib/i18n/types";

import styles from "./experience.module.css";

interface LanguageSwitchProps {
  readonly dictionary: Dictionary;
  readonly locale: Locale;
  readonly onChange: (locale: Locale) => void;
}

export function LanguageSwitch({
  dictionary,
  locale,
  onChange,
}: LanguageSwitchProps) {
  return (
    <div
      aria-label={dictionary.languageSelector}
      className={styles.languageSwitch}
      role="group"
    >
      {(["es", "pt"] as const).map((option) => (
        <button
          key={option}
          aria-pressed={locale === option}
          className={styles.languageButton}
          type="button"
          onClick={() => onChange(option)}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
