"use client";

import {
  ArrowCounterClockwise,
  DotsThree,
  Question,
  Rewind,
  Shuffle,
} from "@phosphor-icons/react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from "react";

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
  readonly onScramble: () => void;
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
  onScramble,
  onUndo,
  undoAvailable,
}: ControlDockProps) {
  const [utilitiesOpen, setUtilitiesOpen] = useState(false);
  const utilitiesId = useId();
  const dockRef = useRef<HTMLElement>(null);
  const utilitiesTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!utilitiesOpen) {
      return;
    }

    const closeFromEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      setUtilitiesOpen(false);
      utilitiesTriggerRef.current?.focus();
    };
    const closeFromOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !dockRef.current?.contains(event.target)
      ) {
        setUtilitiesOpen(false);
      }
    };

    document.addEventListener("keydown", closeFromEscape);
    document.addEventListener("pointerdown", closeFromOutside);
    return () => {
      document.removeEventListener("keydown", closeFromEscape);
      document.removeEventListener("pointerdown", closeFromOutside);
    };
  }, [utilitiesOpen]);

  return (
    <section
      ref={dockRef}
      aria-label={dictionary.controlDockLabel}
      className={styles.controlDock}
      data-utilities-open={String(utilitiesOpen)}
    >
      <div
        className={styles.dockActions}
        data-testid="primary-dock-actions"
      >
        <button
          aria-label={dictionary.dockScramble}
          disabled={disabled}
          type="button"
          onClick={onScramble}
        >
          <Shuffle aria-hidden="true" size={20} weight="bold" />
          <span>{dictionary.dockScramble}</span>
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

      <div className={styles.dockUtilities}>
        <button
          ref={utilitiesTriggerRef}
          aria-controls={utilitiesId}
          aria-expanded={utilitiesOpen}
          aria-label={
            utilitiesOpen
              ? dictionary.controlUtilitiesClose
              : dictionary.controlUtilities
          }
          className={styles.dockUtilitiesToggle}
          type="button"
          onClick={() => setUtilitiesOpen((open) => !open)}
        >
          <DotsThree aria-hidden="true" size={22} weight="bold" />
        </button>

        {utilitiesOpen ? (
          <div
            aria-label={dictionary.controlUtilities}
            className={styles.dockUtilitiesPanel}
            id={utilitiesId}
            role="group"
          >
            <button
              aria-label={dictionary.undo}
              disabled={disabled || !undoAvailable}
              type="button"
              onClick={onUndo}
            >
              <Rewind aria-hidden="true" size={19} weight="bold" />
              <span>{dictionary.undo}</span>
            </button>
            <FaceControls
              dictionary={dictionary}
              isAnimating={disabled}
              onMove={onMove}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
