"use client";

import { X } from "@phosphor-icons/react";

import { PurchaseLink } from "@/components/experience/PurchaseLink";
import type { Dictionary } from "@/lib/i18n/types";

import styles from "./experience.module.css";

interface SuccessMomentProps {
  readonly dictionary: Dictionary;
  readonly isOpen: boolean;
  readonly onDismiss: () => void;
  readonly onReset: () => void;
  readonly purchaseHref: string;
}

export function SuccessMoment({
  dictionary,
  isOpen,
  onDismiss,
  onReset,
  purchaseHref,
}: SuccessMomentProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <section
      aria-labelledby="success-title"
      className={styles.successMoment}
      data-celebrating="true"
    >
      <button
        aria-label={dictionary.closeSuccess}
        className={styles.successClose}
        type="button"
        onClick={onDismiss}
      >
        <X aria-hidden="true" size={20} weight="bold" />
      </button>
      <h2 id="success-title">{dictionary.success}</h2>
      <p>{dictionary.successSecondary}</p>
      <div className={styles.successActions}>
        <PurchaseLink className={styles.successPurchase} href={purchaseHref}>
          {dictionary.successPurchase}
        </PurchaseLink>
        <button type="button" onClick={onReset}>
          {dictionary.reset}
        </button>
      </div>
    </section>
  );
}
