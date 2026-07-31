"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { CELEBRATION_DURATION_MS } from "@/lib/game/celebration";

interface CelebrationTimelineOptions {
  readonly active: boolean;
  readonly invalidate: () => void;
  readonly onComplete?: () => void;
  readonly onSample: (progress: number) => void;
  readonly pageVisible: boolean;
  readonly reducedMotion: boolean;
}

export function useCelebrationTimeline({
  active,
  invalidate,
  onComplete,
  onSample,
  pageVisible,
  reducedMotion,
}: CelebrationTimelineOptions): void {
  const accumulatedVisibleMsRef = useRef(0);
  const activeStartedAtRef = useRef<number | null>(null);
  const celebrationActiveRef = useRef(false);
  const celebrationCompletedRef = useRef(true);
  const onCompleteRef = useRef(onComplete);
  const onSampleRef = useRef(onSample);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onSampleRef.current = onSample;
  }, [onSample]);

  useEffect(() => {
    if (!active || reducedMotion) {
      accumulatedVisibleMsRef.current = 0;
      activeStartedAtRef.current = null;
      celebrationActiveRef.current = false;
      celebrationCompletedRef.current = true;
      onSampleRef.current(1);
      invalidate();
      return;
    }

    if (!celebrationActiveRef.current) {
      accumulatedVisibleMsRef.current = 0;
      celebrationActiveRef.current = true;
      celebrationCompletedRef.current = false;
      onSampleRef.current(0);
      invalidate();
    }

    if (!pageVisible || celebrationCompletedRef.current) {
      activeStartedAtRef.current = null;
      return;
    }

    const startedAt = performance.now();
    activeStartedAtRef.current = startedAt;
    let frame = 0;
    const animate = (time: number) => {
      if (
        activeStartedAtRef.current !== startedAt ||
        celebrationCompletedRef.current
      ) {
        return;
      }

      invalidate();
      const elapsed =
        accumulatedVisibleMsRef.current + Math.max(0, time - startedAt);
      if (elapsed < CELEBRATION_DURATION_MS) {
        frame = window.requestAnimationFrame(animate);
      }
    };
    frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      if (activeStartedAtRef.current === startedAt) {
        accumulatedVisibleMsRef.current = Math.min(
          CELEBRATION_DURATION_MS,
          accumulatedVisibleMsRef.current +
            Math.max(0, performance.now() - startedAt),
        );
        activeStartedAtRef.current = null;
      }
    };
  }, [active, invalidate, pageVisible, reducedMotion]);

  useFrame(() => {
    if (!celebrationActiveRef.current || celebrationCompletedRef.current) {
      return;
    }

    const startedAt = activeStartedAtRef.current;
    const elapsed = Math.min(
      CELEBRATION_DURATION_MS,
      accumulatedVisibleMsRef.current +
        (startedAt === null
          ? 0
          : Math.max(0, performance.now() - startedAt)),
    );
    const progress = elapsed / CELEBRATION_DURATION_MS;
    onSampleRef.current(progress);

    if (progress < 1) {
      return;
    }

    accumulatedVisibleMsRef.current = CELEBRATION_DURATION_MS;
    activeStartedAtRef.current = null;
    celebrationCompletedRef.current = true;
    onCompleteRef.current?.();
  });
}
