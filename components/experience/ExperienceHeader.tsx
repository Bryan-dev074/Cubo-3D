import { LanguageSwitch } from "@/components/experience/LanguageSwitch";
import { PurchaseLink } from "@/components/experience/PurchaseLink";
import type { Dictionary, Locale } from "@/lib/i18n/types";

import styles from "./experience.module.css";

interface ExperienceHeaderProps {
  readonly dictionary: Dictionary;
  readonly locale: Locale;
  readonly onLocaleChange: (locale: Locale) => void;
  readonly purchaseHref: string;
}

export function ExperienceHeader({
  dictionary,
  locale,
  onLocaleChange,
  purchaseHref,
}: ExperienceHeaderProps) {
  return (
    <header className={styles.header}>
      <a className={styles.wordmark} href="#cubo">
        {dictionary.title}
      </a>
      <div className={styles.headerActions}>
        <LanguageSwitch
          dictionary={dictionary}
          locale={locale}
          onChange={onLocaleChange}
        />
        <PurchaseLink className={styles.purchaseButton} href={purchaseHref}>
          {dictionary.purchase}
        </PurchaseLink>
      </div>
    </header>
  );
}
