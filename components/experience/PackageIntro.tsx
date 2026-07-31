"use client";

import { Fragment, useEffect, useRef } from "react";

import type { IntroPhase } from "@/lib/motion/intro-sequence";

import styles from "./experience.module.css";

export interface PackageIntroProps {
  readonly phase: IntroPhase;
  readonly reducedMotion: boolean;
  readonly onPackageOpened: () => void;
}

const FLAPS = ["top", "right", "bottom", "left"] as const;
const RAILS = ["upper", "lower"] as const;
const REGISTRATIONS = ["nw", "ne", "se", "sw"] as const;

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
        (event.animationName === "intro-package-finish" ||
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
        <div className={styles.packageShell} data-testid="package-shell">
          <div
            className={styles.packageInnerFace}
            data-testid="package-inner-face"
          />
          <div
            className={styles.packageAperture}
            data-testid="package-aperture"
          />
          <div
            className={styles.packageIntroSpine}
            data-testid="package-spine"
          >
            CUBO 3D
          </div>
          <span className={styles.packageSerial} data-testid="package-serial">
            CM3D / 03
          </span>
          {REGISTRATIONS.map((registration) => (
            <span
              className={styles.packageIntroRegistration}
              data-registration={registration}
              data-testid="package-registration"
              key={registration}
            />
          ))}
          {RAILS.map((rail) => (
            <span
              className={styles.packageRail}
              data-rail={rail}
              data-testid="package-rail"
              key={rail}
            />
          ))}
          {FLAPS.map((flap) => (
            <Fragment key={flap}>
              <span
                className={styles.packageHinge}
                data-hinge={flap}
                data-testid="package-hinge"
              />
              <div
                className={styles.packageFlap}
                data-flap={flap}
                data-testid="package-intro-flap"
              >
                <span
                  className={styles.packageFlapPrint}
                  data-testid="package-flap-print"
                >
                  CUBO / 03
                </span>
                <i
                  className={styles.packageFlapEdge}
                  data-testid="package-flap-edge"
                />
              </div>
            </Fragment>
          ))}
          <div className={styles.packageSeal} data-testid="package-seal">
            <span>CUBO 3D</span>
            <small>PRECISION OBJECT</small>
          </div>
        </div>
      </div>
    </div>
  );
}
