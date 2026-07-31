"use client";

import { X } from "@phosphor-icons/react";
import {
  useCallback,
  useEffect,
  useRef,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import type { Dictionary } from "@/lib/i18n/types";

import styles from "./experience.module.css";

interface HelpDialogProps {
  readonly backgroundRef: RefObject<HTMLElement | null>;
  readonly dictionary: Dictionary;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly triggerRef: RefObject<HTMLButtonElement | null>;
}

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function HelpDialog({
  backgroundRef,
  dictionary,
  isOpen,
  onClose,
  triggerRef,
}: HelpDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const background = backgroundRef.current;
    const trigger = triggerRef.current;
    background?.setAttribute("inert", "");
    background?.setAttribute("aria-hidden", "true");
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.tabIndex >= 0);
      const first = focusable.at(0);
      const last = focusable.at(-1);
      if (!first || !last) {
        event.preventDefault();
        return;
      }

      const focusIsOutside = !dialog.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || focusIsOutside)) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || focusIsOutside)
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      background?.removeAttribute("inert");
      background?.removeAttribute("aria-hidden");
      trigger?.focus();
    };
  }, [backgroundRef, close, isOpen, triggerRef]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className={styles.dialogBackdrop} onMouseDown={close}>
      <section
        ref={dialogRef}
        aria-labelledby="help-dialog-title"
        aria-modal="true"
        className={styles.helpDialog}
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          aria-label={dictionary.closeHelp}
          className={styles.dialogClose}
          type="button"
          onClick={close}
        >
          <X aria-hidden="true" size={21} weight="bold" />
        </button>
        <p className={styles.instrumentLabel}>CUBO 3D</p>
        <h2 id="help-dialog-title">{dictionary.helpTitle}</h2>
        <p>{dictionary.help}</p>
      </section>
    </div>,
    document.body,
  );
}
