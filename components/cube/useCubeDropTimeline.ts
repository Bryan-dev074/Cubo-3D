"use client";

import { useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";

import {
  sampleCubeDrop,
  type CubeDropProfile,
  type CubeDropSample,
} from "@/lib/motion/cube-drop";
import {
  INTRO_DROP_MS,
  type IntroPhase,
} from "@/lib/motion/intro-sequence";

interface CubeDropTimelineOptions {
  readonly dropProfile: CubeDropProfile;
  readonly introPhase: IntroPhase;
  readonly invalidate: () => void;
  readonly onComplete?: () => void;
  readonly onSample: (sample: CubeDropSample) => void;
  readonly pageVisible: boolean;
  readonly reducedMotion: boolean;
}

export function useCubeDropTimeline({
  dropProfile,
  introPhase,
  invalidate,
  onComplete,
  onSample,
  pageVisible,
  reducedMotion,
}: CubeDropTimelineOptions): void {
  const accumulatedVisibleMsRef = useRef(0);
  const activeStartedAtRef = useRef<number | null>(null);
  const dropActiveRef = useRef(false);
  const dropCompletedRef = useRef(true);
  const onCompleteRef = useRef(onComplete);
  const dropProfileRef = useRef(dropProfile);
  const onSampleRef = useRef(onSample);

  useLayoutEffect(() => {
    dropProfileRef.current = dropProfile;
  }, [dropProfile]);

  useLayoutEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useLayoutEffect(() => {
    onSampleRef.current = onSample;
  }, [onSample]);

  useLayoutEffect(() => {
    if (introPhase !== "drop" || reducedMotion) {
      accumulatedVisibleMsRef.current = 0;
      activeStartedAtRef.current = null;
      dropActiveRef.current = false;
      dropCompletedRef.current = true;
      onSampleRef.current(sampleCubeDrop(1, dropProfileRef.current));
      invalidate();
      return;
    }

    if (!dropActiveRef.current) {
      accumulatedVisibleMsRef.current = 0;
      dropActiveRef.current = true;
      dropCompletedRef.current = false;
      onSampleRef.current(sampleCubeDrop(0, dropProfileRef.current));
      invalidate();
    }

    if (!pageVisible || dropCompletedRef.current) {
      activeStartedAtRef.current = null;
      return;
    }

    const startedAt = performance.now();
    activeStartedAtRef.current = startedAt;
    let frame = 0;
    const animate = (time: number) => {
      if (
        activeStartedAtRef.current !== startedAt ||
        dropCompletedRef.current
      ) {
        return;
      }

      invalidate();
      const elapsed =
        accumulatedVisibleMsRef.current + Math.max(0, time - startedAt);
      if (elapsed < INTRO_DROP_MS) {
        frame = window.requestAnimationFrame(animate);
      }
    };
    frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      if (activeStartedAtRef.current === startedAt) {
        accumulatedVisibleMsRef.current = Math.min(
          INTRO_DROP_MS,
          accumulatedVisibleMsRef.current +
            Math.max(0, performance.now() - startedAt),
        );
        activeStartedAtRef.current = null;
      }
    };
  }, [introPhase, invalidate, pageVisible, reducedMotion]);

  useFrame(() => {
    if (!dropActiveRef.current || dropCompletedRef.current) {
      return;
    }

    const startedAt = activeStartedAtRef.current;
    const elapsed = Math.min(
      INTRO_DROP_MS,
      accumulatedVisibleMsRef.current +
        (startedAt === null
          ? 0
          : Math.max(0, performance.now() - startedAt)),
    );
    const progress = elapsed / INTRO_DROP_MS;
    onSampleRef.current(sampleCubeDrop(progress, dropProfileRef.current));

    if (progress < 1) {
      return;
    }

    accumulatedVisibleMsRef.current = INTRO_DROP_MS;
    activeStartedAtRef.current = null;
    dropCompletedRef.current = true;
    onCompleteRef.current?.();
  });
}
