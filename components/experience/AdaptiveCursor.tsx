"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

import {
  ACTION_CURSOR_INTENT,
  DISABLED_CURSOR_INTENT,
  IDLE_CURSOR_INTENT,
  ORBIT_CURSOR_INTENT,
  normalizeCursorIntent,
  type CursorIntent,
} from "@/lib/motion/cursor-intent";

import styles from "./experience.module.css";

const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const ACTION_SELECTOR =
  'button:not(:disabled), a[href]:not([aria-disabled="true"]), summary:not([aria-disabled="true"])';
const CUBE_STAGE_SELECTOR = "#cube-stage";

export interface AdaptiveCursorProps {
  readonly intent: CursorIntent;
  readonly paused: boolean;
  readonly onMounted?: (mounted: boolean) => void;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

interface MountedReport {
  readonly callback: AdaptiveCursorProps["onMounted"];
  readonly value: boolean;
}

export function AdaptiveCursor({
  intent,
  onMounted,
  paused,
}: AdaptiveCursorProps) {
  const eligible = useSyncExternalStore(
    subscribeToCursorEligibility,
    readCursorEligibility,
    readServerCursorEligibility,
  );
  const nodeRef = useRef<HTMLDivElement>(null);
  const axisRef = useRef<HTMLSpanElement>(null);
  const pointRef = useRef<Point>({ x: 0, y: 0 });
  const frameRef = useRef<number | null>(null);
  const externalIntentRef = useRef(normalizeCursorIntent(intent));
  const pausedRef = useRef(paused);
  const actionHoverRef = useRef(false);
  const orbitPointerRef = useRef<number | null>(null);
  const gestureSuppressedRef = useRef(false);
  const touchInputRef = useRef(false);
  const mountedRef = useRef(false);
  const onMountedRef = useRef(onMounted);
  const lastReportRef = useRef<MountedReport | null>(null);

  const normalizedIntent = normalizeCursorIntent(intent);

  const reportMounted = useCallback((value: boolean) => {
    const callback = onMountedRef.current;
    const previous = lastReportRef.current;

    if (
      callback &&
      (previous?.callback !== callback || previous.value !== value)
    ) {
      callback(value);
    }
    lastReportRef.current = { callback, value };
  }, []);

  useEffect(() => {
    externalIntentRef.current = normalizedIntent;
    pausedRef.current = paused;
    onMountedRef.current = onMounted;
  }, [normalizedIntent, onMounted, paused]);

  useEffect(() => {
    if (!onMounted || !mountedRef.current) {
      return;
    }
    reportMounted(true);
  }, [onMounted, reportMounted]);

  useEffect(() => {
    if (!eligible || !nodeRef.current) {
      return;
    }

    mountedRef.current = true;
    reportMounted(true);

    return () => {
      mountedRef.current = false;
      reportMounted(false);
    };
  }, [eligible, reportMounted]);

  useEffect(() => {
    gestureSuppressedRef.current = false;
    if (normalizedIntent.mode === "disabled") {
      orbitPointerRef.current = null;
    }
    applyIntentToNode(
      nodeRef.current,
      axisRef.current,
      resolveEffectiveIntent({
        actionHovered: actionHoverRef.current,
        external: externalIntentRef.current,
        orbitActive: orbitPointerRef.current !== null,
        paused: pausedRef.current,
        suppressGesture: false,
      }),
    );
  }, [normalizedIntent, paused]);

  useEffect(() => {
    if (!eligible) {
      return;
    }

    const cancelFrame = () => {
      if (frameRef.current === null) {
        return;
      }
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };

    const applyCurrentIntent = () => {
      applyIntentToNode(
        nodeRef.current,
        axisRef.current,
        resolveEffectiveIntent({
          actionHovered: actionHoverRef.current,
          external: externalIntentRef.current,
          orbitActive: orbitPointerRef.current !== null,
          paused: pausedRef.current,
          suppressGesture: gestureSuppressedRef.current,
        }),
      );
    };

    const flushPosition = () => {
      frameRef.current = null;
      const node = nodeRef.current;
      if (!node) {
        return;
      }
      node.style.setProperty(
        "transform",
        `translate3d(${pointRef.current.x}px, ${pointRef.current.y}px, 0)`,
      );
    };

    const schedulePosition = () => {
      if (frameRef.current === null) {
        frameRef.current = requestAnimationFrame(flushPosition);
      }
    };

    const showAtPointer = (event: PointerEvent) => {
      const node = nodeRef.current;
      if (!node) {
        return;
      }
      pointRef.current = { x: event.clientX, y: event.clientY };
      node.dataset.visible = "true";
      schedulePosition();
    };

    const clearTransientState = ({
      suppressGesture,
    }: {
      suppressGesture: boolean;
    }) => {
      cancelFrame();
      actionHoverRef.current = false;
      orbitPointerRef.current = null;
      if (suppressGesture) {
        gestureSuppressedRef.current = true;
      }
      const node = nodeRef.current;
      if (node) {
        node.dataset.visible = "false";
      }
      applyCurrentIntent();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (isTouchPointer(event)) {
        touchInputRef.current = true;
        clearTransientState({ suppressGesture: true });
        return;
      }
      if (document.visibilityState === "hidden") {
        clearTransientState({ suppressGesture: true });
        return;
      }

      touchInputRef.current = false;
      const externalMode = externalIntentRef.current.mode;
      if (
        gestureSuppressedRef.current &&
        externalMode !== "layer-drag" &&
        externalMode !== "orbit"
      ) {
        gestureSuppressedRef.current = false;
      }

      if (orbitPointerRef.current !== null && (event.buttons & 2) === 0) {
        orbitPointerRef.current = null;
      }
      actionHoverRef.current = isActionTarget(event.target);
      applyCurrentIntent();
      showAtPointer(event);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (isTouchPointer(event)) {
        touchInputRef.current = true;
        clearTransientState({ suppressGesture: true });
        return;
      }

      touchInputRef.current = false;
      actionHoverRef.current = isActionTarget(event.target);
      if (
        event.button === 2 &&
        isCubeStageTarget(event.target) &&
        externalIntentRef.current.mode !== "disabled" &&
        !pausedRef.current
      ) {
        orbitPointerRef.current = pointerIdentity(event);
        gestureSuppressedRef.current = false;
      }
      applyCurrentIntent();
      showAtPointer(event);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (isTouchPointer(event)) {
        clearTransientState({ suppressGesture: true });
        return;
      }

      if (
        orbitPointerRef.current === pointerIdentity(event) ||
        event.button === 2
      ) {
        orbitPointerRef.current = null;
      }
      actionHoverRef.current = isActionTarget(event.target);
      applyCurrentIntent();
    };

    const handlePointerCancel = () => {
      clearTransientState({ suppressGesture: true });
    };

    const handlePointerLeave = (event: PointerEvent) => {
      if (!isTouchPointer(event)) {
        clearTransientState({ suppressGesture: true });
      }
    };

    const handleBlur = () => {
      clearTransientState({ suppressGesture: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        clearTransientState({ suppressGesture: true });
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("pointerleave", handlePointerLeave);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelFrame();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("pointerleave", handlePointerLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      actionHoverRef.current = false;
      orbitPointerRef.current = null;
      gestureSuppressedRef.current = false;
      touchInputRef.current = false;
    };
  }, [eligible]);

  if (!eligible) {
    return null;
  }

  const initialIntent = paused ? DISABLED_CURSOR_INTENT : normalizedIntent;

  return (
    <div
      aria-hidden="true"
      className={styles.adaptiveCursor}
      data-axis={initialIntent.axis}
      data-direction={initialIntent.direction}
      data-mode={initialIntent.mode}
      data-testid="adaptive-cursor"
      data-visible="false"
      ref={nodeRef}
      style={{ pointerEvents: "none" }}
    >
      <span className={styles.cursorDot} data-cursor-part="dot" />
      <span className={styles.cursorRing} data-cursor-part="ring" />
      <span className={styles.cursorArc} data-cursor-part="arc" />
      <span className={styles.cursorOrbit} data-cursor-part="orbit" />
      <span
        className={styles.cursorAxis}
        data-cursor-part="axis"
        ref={axisRef}
      >
        {initialIntent.axis?.toUpperCase() ?? ""}
      </span>
    </div>
  );
}

interface EffectiveIntentInput {
  readonly actionHovered: boolean;
  readonly external: CursorIntent;
  readonly orbitActive: boolean;
  readonly paused: boolean;
  readonly suppressGesture: boolean;
}

function resolveEffectiveIntent({
  actionHovered,
  external,
  orbitActive,
  paused,
  suppressGesture,
}: EffectiveIntentInput): CursorIntent {
  if (paused) {
    return DISABLED_CURSOR_INTENT;
  }
  if (suppressGesture && isGestureMode(external.mode)) {
    return IDLE_CURSOR_INTENT;
  }
  if (external.mode === "layer-drag") {
    return external;
  }
  if (orbitActive || external.mode === "orbit") {
    return ORBIT_CURSOR_INTENT;
  }
  if (actionHovered || external.mode === "action") {
    return ACTION_CURSOR_INTENT;
  }
  if (external.mode === "layer-ready") {
    return external;
  }
  if (external.mode === "disabled") {
    return DISABLED_CURSOR_INTENT;
  }
  return IDLE_CURSOR_INTENT;
}

function applyIntentToNode(
  node: HTMLDivElement | null,
  axisNode: HTMLSpanElement | null,
  intent: CursorIntent,
) {
  if (!node) {
    return;
  }
  node.dataset.mode = intent.mode;
  setOptionalData(node, "axis", intent.axis);
  setOptionalData(node, "direction", intent.direction);
  if (axisNode) {
    axisNode.textContent = intent.axis?.toUpperCase() ?? "";
  }
}

function setOptionalData(
  node: HTMLElement,
  key: "axis" | "direction",
  value: string | undefined,
) {
  if (value) {
    node.dataset[key] = value;
  } else {
    delete node.dataset[key];
  }
}

function isGestureMode(mode: CursorIntent["mode"]) {
  return mode === "layer-ready" || mode === "layer-drag" || mode === "orbit";
}

function isTouchPointer(event: PointerEvent) {
  return event.pointerType === "touch";
}

function isActionTarget(target: EventTarget | null) {
  return closestTarget(target, ACTION_SELECTOR) !== null;
}

function isCubeStageTarget(target: EventTarget | null) {
  return closestTarget(target, CUBE_STAGE_SELECTOR) !== null;
}

function closestTarget(target: EventTarget | null, selector: string) {
  return target instanceof Element ? target.closest(selector) : null;
}

function pointerIdentity(event: PointerEvent) {
  return Number.isFinite(event.pointerId) ? event.pointerId : -1;
}

function readServerCursorEligibility() {
  return false;
}

function readCursorEligibility() {
  if (typeof window === "undefined") {
    return false;
  }
  if (typeof window.matchMedia !== "function") {
    return false;
  }

  return (
    window.matchMedia(FINE_POINTER_QUERY).matches &&
    !window.matchMedia(REDUCED_MOTION_QUERY).matches
  );
}

function subscribeToCursorEligibility(onChange: () => void) {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return () => undefined;
  }

  const finePointer = window.matchMedia(FINE_POINTER_QUERY);
  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
  addMediaListener(finePointer, onChange);
  addMediaListener(reducedMotion, onChange);

  return () => {
    removeMediaListener(finePointer, onChange);
    removeMediaListener(reducedMotion, onChange);
  };
}

function addMediaListener(media: MediaQueryList, listener: () => void) {
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", listener);
  } else {
    media.addListener(listener);
  }
}

function removeMediaListener(media: MediaQueryList, listener: () => void) {
  if (typeof media.removeEventListener === "function") {
    media.removeEventListener("change", listener);
  } else {
    media.removeListener(listener);
  }
}
