import type { Dictionary } from "@/lib/i18n/types";

import { PlotterTitle } from "./PlotterTitle";
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
  return (
    <section className={styles.heroCopy} data-region="hero-copy">
      <div
        className={`${styles.registrationMark} ${styles.heroRule}`}
        aria-hidden="true"
      />
      <PlotterTitle id="experience-title" title={dictionary.title} />
      <p className={styles.promise}>{dictionary.description}</p>
      <button
        className={styles.scrambleButton}
        disabled={disabled}
        type="button"
        onClick={onScramble}
      >
        {dictionary.scramble}
      </button>
      <p className={styles.firstUseHint} id="cube-drag-hint">
        <span className={styles.desktopDragHint}>{dictionary.dragHint}</span>
        <span className={styles.touchDragHint}>{dictionary.dragHintTouch}</span>
      </p>
    </section>
  );
}
