"use client";

import { useEffect, useRef } from "react";

import type { IntroPhase } from "@/lib/motion/intro-sequence";

import styles from "./experience.module.css";

export interface PackageIntroProps {
  readonly phase: IntroPhase;
  readonly reducedMotion: boolean;
  readonly onPackageOpened: () => void;
}

const FLAPS = ["top", "right", "bottom", "left"] as const;

export function PackageIntro({
  onPackageOpened,
  phase,
  reducedMotion,
}: PackageIntroProps) {
  const completedRef = useRef(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase === "ready") {
      return;
    }
    const timeline = timelineRef.current;
    if (!timeline) {
      return;
    }

    const handleAnimationEnd = (event: AnimationEvent) => {
      if (
        event.target === timeline &&
        (event.animationName === "package-intro-reveal" ||
          event.animationName === "package-intro-reduced") &&
        !completedRef.current
      ) {
        completedRef.current = true;
        onPackageOpened();
      }
    };

    timeline.addEventListener("animationend", handleAnimationEnd);
    return () => timeline.removeEventListener("animationend", handleAnimationEnd);
  }, [onPackageOpened, phase]);

  if (phase === "ready") {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className={styles.packageIntro}
      data-phase={phase}
      data-reduced-motion={String(reducedMotion)}
      data-testid="package-intro"
    >
      <div
        className={styles.packageIntroTimeline}
        data-testid="package-intro-timeline"
        ref={timelineRef}
      >
        <div className={styles.packageIntroSpine}>CUBO 3D</div>
        <div className={styles.packageIntroRegistration} />
        {FLAPS.map((flap) => (
          <div
            key={flap}
            className={styles.packageFlap}
            data-flap={flap}
            data-testid="package-intro-flap"
          />
        ))}
        <div className={styles.packageSeal}>CUBO 3D</div>
      </div>
    </div>
  );
}
