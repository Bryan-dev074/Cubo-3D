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

export function HelpDialog({
  backgroundRef,
  dictionary,
  isOpen,
  onClose,
  triggerRef,
}: HelpDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

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
