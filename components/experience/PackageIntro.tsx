"use client";

import { Fragment, useEffect, useRef } from "react";

import type { IntroPhase } from "@/lib/motion/intro-sequence";

import styles from "./experience.module.css";

export interface PackageIntroProps {
  readonly phase: IntroPhase;
  readonly reducedMotion: boolean;
  readonly onPackageOpened: () => void;
}

const PANELS = [
  { flap: "top", destination: "header" },
  { flap: "right", destination: "telemetry" },
  { flap: "bottom", destination: "dock" },
  { flap: "left", destination: "hero" },
] as const;
const BACKING_SIDES = ["top", "right", "bottom", "left"] as const;
const RAILS = ["upper", "lower"] as const;
const REGISTRATIONS = ["nw", "ne", "se", "sw"] as const;
const PACKAGE_COMPLETION_ANIMATIONS = [
  "intro-package-finish",
  "package-intro-reduced",
] as const;

function matchesPackageCompletionAnimation(animationName: string): boolean {
  return PACKAGE_COMPLETION_ANIMATIONS.some(
    (approvedName) =>
      animationName === approvedName ||
      animationName.endsWith(`__${approvedName}`) ||
      animationName.endsWith(`_${approvedName}`) ||
      animationName.startsWith(`${approvedName}__`) ||
      animationName.startsWith(`${approvedName}_`),
  );
}

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
        matchesPackageCompletionAnimation(event.animationName) &&
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
      <div className={styles.packageBacking} data-testid="package-backing">
        {BACKING_SIDES.map((side) => (
          <span
            className={styles.packageBackingPanel}
            data-side={side}
            data-testid="package-backing-panel"
            key={side}
          >
            <i
              className={styles.packageBackingSurface}
              data-testid="package-backing-surface"
            />
          </span>
        ))}
      </div>
      <div
        className={styles.packageIntroTimeline}
        data-testid="package-intro-timeline"
        ref={timelineRef}
      >
        <span
          className={styles.packageGroundShadow}
          data-testid="package-ground-shadow"
        />
        <div className={styles.packageShell} data-testid="package-shell">
          <div className={styles.packageOrigin} data-testid="package-origin" />
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
          {PANELS.map(({ flap, destination }) => (
            <Fragment key={flap}>
              <span
                className={styles.packageHinge}
                data-hinge={flap}
                data-testid="package-hinge"
              />
              <div
                className={styles.packageFlap}
                data-destination={destination}
                data-flap={flap}
                data-testid="package-intro-flap"
              >
                <span
                  className={styles.packageFlapFace}
                  data-face="outer"
                  data-testid="package-flap-face"
                >
                  <span
                    className={styles.packageFlapPrint}
                    data-testid="package-flap-print"
                  >
                    CUBO / 03
                  </span>
                </span>
                <span
                  className={styles.packageFlapFace}
                  data-face="inner"
                  data-testid="package-flap-face"
                />
                <i
                  className={styles.packageFlapEdge}
                  data-testid="package-flap-edge"
                />
              </div>
            </Fragment>
          ))}
          <div className={styles.packageSeal} data-testid="package-seal">
            <span
              className={styles.packageSealHalf}
              data-side="start"
              data-testid="package-seal-half"
            />
            <span className={styles.packageSealCopy}>
              CUBO 3D<small>PRECISION OBJECT</small>
            </span>
            <span
              className={styles.packageSealHalf}
              data-side="end"
              data-testid="package-seal-half"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
