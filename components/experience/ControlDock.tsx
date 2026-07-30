"use client";

import { ArrowCounterClockwise, Question, Rewind } from "@phosphor-icons/react";
import type { RefObject } from "react";

import { FaceControls } from "@/components/experience/FaceControls";
import type { CubeMove } from "@/lib/cube/types";
import type { Dictionary } from "@/lib/i18n/types";

import styles from "./experience.module.css";

interface ControlDockProps {
  readonly dictionary: Dictionary;
  readonly disabled: boolean;
  readonly helpTriggerRef: RefObject<HTMLButtonElement | null>;
  readonly onHelp: () => void;
  readonly onMove: (move: CubeMove) => void;
  readonly onReset: () => void;
  readonly onUndo: () => void;
  readonly undoAvailable: boolean;
}

export function ControlDock({
  dictionary,
  disabled,
  helpTriggerRef,
  onHelp,
  onMove,
  onReset,
  onUndo,
  undoAvailable,
}: ControlDockProps) {
  return (
    <section
      aria-label={dictionary.controlDockLabel}
      className={styles.controlDock}
    >
      <div className={styles.dockActions}>
        <button
          aria-label={dictionary.undo}
          disabled={disabled || !undoAvailable}
          type="button"
          onClick={onUndo}
        >
          <Rewind aria-hidden="true" size={19} weight="bold" />
          <span>{dictionary.undo}</span>
        </button>
        <button
          aria-label={dictionary.reset}
          disabled={disabled}
          type="button"
          onClick={onReset}
        >
          <ArrowCounterClockwise aria-hidden="true" size={19} weight="bold" />
          <span>{dictionary.reset}</span>
        </button>
        <button
          ref={helpTriggerRef}
          aria-label={dictionary.helpButton}
          type="button"
          onClick={onHelp}
        >
          <Question aria-hidden="true" size={20} weight="bold" />
          <span>{dictionary.helpButton}</span>
        </button>
      </div>
      <FaceControls
        dictionary={dictionary}
        isAnimating={disabled}
        onMove={onMove}
      />
    </section>
  );
}
