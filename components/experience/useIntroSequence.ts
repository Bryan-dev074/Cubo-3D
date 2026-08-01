"use client";

import {
  useCallback,
  useEffect,
  useReducer,
  useSyncExternalStore,
} from "react";

import {
  createIntroState,
  INTRO_DROP_MS,
  INTRO_PACKAGE_MS,
  INTRO_REDUCED_MS,
  INTRO_TOTAL_MS,
  introReducer,
} from "@/lib/motion/intro-sequence";

function reducedMotionMedia(): MediaQueryList | undefined {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return undefined;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)");
}

function useVisiblePhaseWatchdog(
  active: boolean,
  duration: number,
  onElapsed: () => void,
): void {
  useEffect(() => {
    if (!active) {
      return;
    }

    let elapsed = 0;
    let previous = performance.now();
    let frame = 0;
    let completed = false;
    let wasVisible = document.visibilityState === "visible";
    const completeIfElapsed = () => {
      if (completed || elapsed < duration) {
        return false;
      }

      completed = true;
      cancelAnimationFrame(frame);
      onElapsed();
      return true;
    };
    const handleVisibilityChange = () => {
      const now = performance.now();
      const visible = document.visibilityState === "visible";
      if (wasVisible && !visible) {
        elapsed += Math.max(0, now - previous);
      }
      previous = now;
      wasVisible = visible;
      completeIfElapsed();
    };
    const tick = (now: number) => {
      const visible = document.visibilityState === "visible";
      if (visible && wasVisible) {
        elapsed += Math.max(0, now - previous);
      }
      previous = now;
      wasVisible = visible;
      if (completeIfElapsed()) {
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [active, duration, onElapsed]);
}

export function useIntroSequence() {
  const [state, dispatch] = useReducer(introReducer, false, createIntroState);
  const subscribeToReducedMotion = useCallback(
    (onStoreChange: () => void) => {
      const media = reducedMotionMedia();
      if (!media) {
        return () => undefined;
      }

      const handleChange = (event: MediaQueryListEvent) => {
        onStoreChange();
        if (event.matches) {
          dispatch({ type: "skip" });
        }
      };
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    },
    [],
  );
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    () => reducedMotionMedia()?.matches ?? false,
    () => false,
  );
  const reducedMotion = state.reducedMotion || prefersReducedMotion;

  const markSceneReady = useCallback(
    () => dispatch({ type: "scene-ready" }),
    [],
  );
  const markPackageOpened = useCallback(() => {
    dispatch({ type: reducedMotion ? "skip" : "package-opened" });
  }, [reducedMotion]);
  const markDropComplete = useCallback(
    () => dispatch({ type: "drop-complete" }),
    [],
  );
  const finishReveal = useCallback(
    () => dispatch({ type: "reveal-timeout" }),
    [],
  );
  const skip = useCallback(() => dispatch({ type: "skip" }), []);

  useEffect(() => {
    dispatch({ type: "start" });
  }, []);

  useVisiblePhaseWatchdog(
    state.phase !== "sealed" && state.phase !== "ready",
    INTRO_TOTAL_MS,
    skip,
  );
  useVisiblePhaseWatchdog(
    state.phase === "opening",
    reducedMotion ? INTRO_REDUCED_MS : INTRO_PACKAGE_MS,
    markPackageOpened,
  );
  useVisiblePhaseWatchdog(
    state.phase === "reveal",
    INTRO_DROP_MS,
    finishReveal,
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Tab") {
        skip();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [skip]);

  return {
    phase: state.phase,
    reducedMotion,
    markSceneReady,
    markPackageOpened,
    markDropComplete,
    skip,
  };
}
