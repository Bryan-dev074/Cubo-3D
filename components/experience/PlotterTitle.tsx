import type { CSSProperties } from "react";

import styles from "./experience.module.css";

interface PlotterTitleProps {
  readonly id: string;
  readonly title: string;
}

const PLOTTER_CYCLE_MS = 10_800;
const WRITE_INTERVAL_MS = 50;
const WRITE_DURATION_MS = 160;
const ERASE_START_MS = 9_800;
const ERASE_INTERVAL_MS = 28;
const ERASE_DURATION_MS = 24;

function asCyclePercent(milliseconds: number): string {
  return `${((milliseconds / PLOTTER_CYCLE_MS) * 100).toFixed(6)}%`;
}

export function PlotterTitle({ id, title }: PlotterTitleProps) {
  const [first = title, ...rest] = title.trim().split(/\s+/u);
  const lines = [first, rest.join(" ")];
  const glyphCount = Array.from(lines.join("")).length;
  let glyphIndex = 0;

  return (
    <h1
      aria-label={title}
      className={styles.plotterTitle}
      data-testid="plotter-title"
      id={id}
    >
      {lines.map((line, lineIndex) => (
        <span
          aria-hidden="true"
          className={styles.plotterLine}
          data-testid="plotter-line"
          key={`${lineIndex}-${line}`}
        >
          <span className={styles.plotterBase} data-testid="plotter-base">
            {line}
          </span>
          <span className={styles.plotterInk}>
            {Array.from(line).map((glyph) => {
              const index = glyphIndex++;
              const writeStart = index * WRITE_INTERVAL_MS;
              const writeEnd = writeStart + WRITE_DURATION_MS;
              const eraseStart =
                ERASE_START_MS +
                (glyphCount - index - 1) * ERASE_INTERVAL_MS;
              const eraseEnd = eraseStart + ERASE_DURATION_MS;
              const timing = `linear(0 0%, 0 ${asCyclePercent(
                writeStart,
              )}, 1 ${asCyclePercent(writeEnd)}, 1 ${asCyclePercent(
                eraseStart,
              )}, 0 ${asCyclePercent(eraseEnd)}, 0 100%)`;

              return (
                <span
                  className={styles.plotterGlyph}
                  data-erase-end={eraseEnd}
                  data-erase-start={eraseStart}
                  data-glyph-index={index}
                  data-testid="plotter-glyph"
                  data-write-end={writeEnd}
                  data-write-start={writeStart}
                  key={`${index}-${glyph}`}
                  style={
                    {
                      "--glyph-index": index,
                      "--glyph-timing": timing,
                    } as CSSProperties
                  }
                >
                  {glyph}
                </span>
              );
            })}
          </span>
        </span>
      ))}
      <span
        aria-hidden="true"
        className={styles.plotterRegister}
        data-testid="plotter-register"
      />
    </h1>
  );
}
