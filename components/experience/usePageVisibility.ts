"use client";

import { useSyncExternalStore } from "react";

const readServerVisibility = () => true;

function readPageVisibility(): boolean {
  return (
    typeof document === "undefined" || document.visibilityState !== "hidden"
  );
}

function subscribeToPageVisibility(onStoreChange: () => void): () => void {
  if (typeof document === "undefined") {
    return () => undefined;
  }

  document.addEventListener("visibilitychange", onStoreChange);
  return () => document.removeEventListener("visibilitychange", onStoreChange);
}

export function usePageVisibility(): boolean {
  return useSyncExternalStore(
    subscribeToPageVisibility,
    readPageVisibility,
    readServerVisibility,
  );
}
