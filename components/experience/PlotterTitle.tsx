import type { CSSProperties } from "react";

import styles from "./experience.module.css";

interface PlotterTitleProps {
  readonly id: string;
  readonly title: string;
}

export function PlotterTitle({ id, title }: PlotterTitleProps) {
  const [first = title, ...rest] = title.trim().split(/\s+/u);
  const lines = [first, rest.join(" ")];
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

              return (
                <span
                  className={styles.plotterGlyph}
                  data-testid="plotter-glyph"
                  key={`${index}-${glyph}`}
                  style={
                    {
                      "--glyph-delay": `${index * 34}ms`,
                      "--glyph-index": index,
                    } as CSSProperties
                  }
                >
                  {glyph}
                </span>
              );
            })}
          </span>
          <span className={styles.plotterRegister} />
        </span>
      ))}
    </h1>
  );
}
