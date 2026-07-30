import type { Dictionary } from "@/lib/i18n/types";

import styles from "./experience.module.css";

interface HeroCopyProps {
  readonly dictionary: Dictionary;
  readonly disabled: boolean;
  readonly onScramble: () => void;
}

export function HeroCopy({
  dictionary,
  disabled,
  onScramble,
}: HeroCopyProps) {
  const [titleLead, ...titleRest] = dictionary.title.split(" ");

  return (
    <section className={styles.heroCopy}>
      <div className={styles.registrationMark} aria-hidden="true" />
      <h1 aria-label={dictionary.title} id="experience-title">
        <span aria-hidden="true" data-testid="title-line">
          {titleLead}
        </span>
        <span aria-hidden="true" data-testid="title-line">
          {titleRest.join(" ")}
        </span>
      </h1>
      <p className={styles.promise}>{dictionary.description}</p>
      <button
        className={styles.scrambleButton}
        disabled={disabled}
        type="button"
        onClick={onScramble}
      >
        {dictionary.scramble}
      </button>
    </section>
  );
}
