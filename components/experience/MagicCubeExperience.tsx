"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { CubeCanvas } from "@/components/cube/CubeCanvas";
import { AdaptiveCursor } from "@/components/experience/AdaptiveCursor";
import { ControlDock } from "@/components/experience/ControlDock";
import { ExperienceHeader } from "@/components/experience/ExperienceHeader";
import { HelpDialog } from "@/components/experience/HelpDialog";
import { HeroCopy } from "@/components/experience/HeroCopy";
import {
  LiveTelemetry,
  formatMoveName,
} from "@/components/experience/LiveTelemetry";
import { PackageIntro } from "@/components/experience/PackageIntro";
import { PurchaseLink } from "@/components/experience/PurchaseLink";
import { SuccessMoment } from "@/components/experience/SuccessMoment";
import { useIntroSequence } from "@/components/experience/useIntroSequence";
import { useLocale } from "@/components/experience/useLocale";
import { usePageVisibility } from "@/components/experience/usePageVisibility";
import { generateScramble } from "@/lib/cube/scramble";
import type { CubeMove } from "@/lib/cube/types";
import { CELEBRATION_DURATION_MS } from "@/lib/game/celebration";
import {
  createInitialGameState,
  gameReducer,
  type QueuedMove,
} from "@/lib/game/reducer";
import { selectActiveMove, shouldCelebrate } from "@/lib/game/selectors";
import { createTelemetrySnapshot } from "@/lib/game/telemetry";
import { dictionaries } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";
import { sampleCubeDrop } from "@/lib/motion/cube-drop";
import {
  IDLE_CURSOR_INTENT,
  normalizeCursorIntent,
  type CursorIntent,
} from "@/lib/motion/cursor-intent";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

import styles from "./experience.module.css";

type Announcement =
  | { readonly kind: "move"; readonly move: CubeMove }
  | { readonly kind: "scramble" }
  | { readonly kind: "reset" }
  | { readonly kind: "error" }
  | { readonly kind: "success" }
  | null;

const SHADOW_START = sampleCubeDrop(0);
const SHADOW_FINAL = sampleCubeDrop(1);
const SPINE_WORDMARK = Array.from("CUBO3D");

export interface AmbientMotionConditions {
  readonly celebrationActive: boolean;
  readonly helpOpen: boolean;
  readonly introReady: boolean;
  readonly pageVisible: boolean;
  readonly queueActive: boolean;
  readonly reducedMotion: boolean;
  readonly sceneInteracting: boolean;
  readonly successOpen: boolean;
}

export function shouldPauseAmbientMotion({
  celebrationActive,
  helpOpen,
  introReady,
  pageVisible,
  queueActive,
  reducedMotion,
  sceneInteracting,
  successOpen,
}: AmbientMotionConditions): boolean {
  return (
    !introReady ||
    sceneInteracting ||
    queueActive ||
    celebrationActive ||
    helpOpen ||
    successOpen ||
    !pageVisible ||
    reducedMotion
  );
}

export function MagicCubeExperience() {
  const {
    markDropComplete,
    markPackageOpened,
    markSceneReady,
    phase: introPhase,
    reducedMotion: introReducedMotion,
    skip: skipIntro,
  } = useIntroSequence();
  const pageVisible = usePageVisibility();
  const [locale, setLocale] = useLocale();
  const dictionary = dictionaries[locale];
  const [state, dispatch] = useReducer(
    gameReducer,
    undefined,
    createInitialGameState,
  );
  const [isSceneInteracting, setSceneInteracting] = useState(false);
  const [cursorIntent, setCursorIntent] = useState<CursorIntent>(
    IDLE_CURSOR_INTENT,
  );
  const [customCursorMounted, setCustomCursorMounted] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [celebrationActive, setCelebrationActive] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const celebrationElapsedRef = useRef(0);
  const helpTriggerRef = useRef<HTMLButtonElement>(null);
  const moveRequestClaimedRef = useRef(false);
  const purchaseHref = useMemo(() => buildWhatsAppUrl(locale), [locale]);
  const activeMove = selectActiveMove(state);
  const telemetry = useMemo(
    () => createTelemetrySnapshot(state, activeMove),
    [activeMove, state],
  );
  const isAnimating = state.queue.length > 0;
  const introLocked = introPhase !== "ready";
  const motionPaused = shouldPauseAmbientMotion({
    celebrationActive,
    helpOpen,
    introReady: !introLocked,
    pageVisible,
    queueActive: isAnimating,
    reducedMotion: introReducedMotion,
    sceneInteracting: isSceneInteracting,
    successOpen,
  });
  const controlsLocked = introLocked || isAnimating || isSceneInteracting;
  const handleCursorIntentChange = useCallback((intent: CursorIntent) => {
    const normalized = normalizeCursorIntent(intent);
    setCursorIntent((current) =>
      current === normalized ? current : normalized,
    );
  }, []);
  const handleLocaleChange = useCallback(
    (nextLocale: Locale) => {
      setCursorIntent(IDLE_CURSOR_INTENT);
      setLocale(nextLocale);
    },
    [setLocale],
  );
  const handleSceneError = useCallback(
    () => {
      skipIntro();
      setAnnouncement({ kind: "error" });
    },
    [skipIntro],
  );

  useEffect(() => {
    if (!celebrationActive) {
      celebrationElapsedRef.current = 0;
      return;
    }

    if (!pageVisible) {
      return;
    }

    const startedAt = performance.now();
    const remaining = Math.max(
      0,
      CELEBRATION_DURATION_MS - celebrationElapsedRef.current,
    );
    const timer = window.setTimeout(() => {
      celebrationElapsedRef.current = CELEBRATION_DURATION_MS;
      setCelebrationActive(false);
    }, remaining);

    return () => {
      window.clearTimeout(timer);
      celebrationElapsedRef.current = Math.min(
        CELEBRATION_DURATION_MS,
        celebrationElapsedRef.current +
          Math.max(0, performance.now() - startedAt),
      );
    };
  }, [celebrationActive, pageVisible]);

  useEffect(() => {
    if (!customCursorMounted) {
      document.body.removeAttribute("data-cube-custom-cursor");
      return;
    }

    document.body.setAttribute("data-cube-custom-cursor", "true");
    return () => {
      document.body.removeAttribute("data-cube-custom-cursor");
    };
  }, [customCursorMounted]);

  const queueMove = (move: CubeMove) => {
    // A gesture owns its release while onInteractionLockChange is true. Queue
    // length plus the synchronous claim prevent two requests in one event from
    // entering before React publishes the queued state.
    if (
      !introLocked &&
      state.queue.length === 0 &&
      !moveRequestClaimedRef.current
    ) {
      moveRequestClaimedRef.current = true;
      setCelebrationActive(false);
      setSuccessOpen(false);
      setAnnouncement(null);
      dispatch({ type: "queue-move", move });
    }
  };

  const confirmMove = () => {
    const queued = state.queue[0];
    if (!queued) {
      return;
    }

    const confirmedState = gameReducer(state, { type: "confirm-move" });
    const willCelebrate = shouldCelebrate(confirmedState);
    if (state.queue.length === 1) {
      moveRequestClaimedRef.current = false;
    }
    dispatch({ type: "confirm-move" });
    if (willCelebrate) {
      setCelebrationActive(true);
      setSuccessOpen(true);
      setAnnouncement({ kind: "success" });
      dispatch({ type: "mark-celebrated" });
    } else {
      setAnnouncement(announcementForConfirmedMove(state.scramble, queued));
    }
  };

  const startScramble = () => {
    if (controlsLocked) {
      return;
    }

    setSuccessOpen(false);
    setCelebrationActive(false);
    setAnnouncement(null);
    moveRequestClaimedRef.current = true;
    dispatch({
      type: "start-scramble",
      moves: generateScramble({ length: 20 }),
    });
  };

  const reset = () => {
    if (controlsLocked) {
      return;
    }

    dispatch({ type: "reset" });
    moveRequestClaimedRef.current = false;
    setCelebrationActive(false);
    setSuccessOpen(false);
    setAnnouncement({ kind: "reset" });
  };

  const resetFromSuccess = () => {
    dispatch({ type: "reset" });
    moveRequestClaimedRef.current = false;
    setCelebrationActive(false);
    setSuccessOpen(false);
    setAnnouncement({ kind: "reset" });
  };

  const undo = () => {
    if (
      controlsLocked ||
      state.userHistory.length === 0 ||
      moveRequestClaimedRef.current
    ) {
      return;
    }

    moveRequestClaimedRef.current = true;
    setCelebrationActive(false);
    setSuccessOpen(false);
    setAnnouncement(null);
    dispatch({ type: "undo" });
  };

  return (
    <main
      aria-labelledby="experience-title"
      className={styles.experience}
      data-custom-cursor={customCursorMounted ? "true" : undefined}
      data-intro-phase={introPhase}
      data-motion-paused={String(motionPaused)}
      data-page-visible={String(pageVisible)}
      id="cubo"
      style={
        {
          "--cube-shadow-start-opacity": SHADOW_START.shadowOpacity,
          "--cube-shadow-start-scale": SHADOW_START.shadowScale,
          "--cube-shadow-final-opacity": SHADOW_FINAL.shadowOpacity,
          "--cube-shadow-final-scale": SHADOW_FINAL.shadowScale,
        } as CSSProperties
      }
    >
      <PackageIntro
        onPackageOpened={markPackageOpened}
        phase={introPhase}
        reducedMotion={introReducedMotion}
      />
      <aside
        aria-hidden="true"
        className={styles.cobaltSpine}
        data-testid="editorial-spine"
      >
        <span
          aria-hidden="true"
          className={styles.spineInspectionBeam}
          data-spine-motion="true"
          data-testid="spine-inspection-beam"
        />
        <div className={styles.spineIntro}>
          <strong
            className={styles.spineIntroTitle}
            data-spine-motion="true"
          >
            {dictionary.spineTitle}
          </strong>
          <span
            className={styles.spineIntroTagline}
            data-spine-motion="true"
          >
            {dictionary.spineTagline}
          </span>
          <i
            aria-hidden="true"
            className={styles.spineRule}
            data-spine-motion="true"
            data-testid="spine-rule"
          />
        </div>

        <strong aria-hidden="true" className={styles.spineWordmark}>
          {SPINE_WORDMARK.map((glyph, index) => (
            <span
              className={styles.spineGlyph}
              data-spine-motion="true"
              data-testid="spine-glyph"
              data-word-break={index === 4 ? "true" : undefined}
              key={`${glyph}-${index}`}
              style={{ "--spine-index": index } as CSSProperties}
            >
              {glyph}
            </span>
          ))}
        </strong>

        <div className={styles.spineFooter}>
          <i
            aria-hidden="true"
            className={styles.spineRule}
            data-spine-motion="true"
            data-testid="spine-rule"
          />
          <strong
            data-spine-motion="true"
            style={{ "--spine-index": 0 } as CSSProperties}
          >
            {dictionary.spineProduct}
          </strong>
          <span
            data-spine-motion="true"
            data-testid="spine-footer-line"
            style={{ "--spine-index": 1 } as CSSProperties}
          >
            {dictionary.spinePlay}
          </span>
          <span
            data-spine-motion="true"
            data-testid="spine-footer-line"
            style={{ "--spine-index": 2 } as CSSProperties}
          >
            {dictionary.spineEngineering}
          </span>
          <span
            data-spine-motion="true"
            data-testid="spine-footer-line"
            style={{ "--spine-index": 3 } as CSSProperties}
          >
            {dictionary.spinePrecision}
          </span>
          <svg
            aria-hidden="true"
            className={styles.spineDiagram}
            data-testid="spine-diagram"
            viewBox="0 0 64 64"
          >
            <g
              data-layer="base"
              data-spine-motion="true"
              data-testid="spine-diagram-layer"
            >
              <path d="M32 4 57 18 32 32 7 18 32 4Z" />
            </g>
            <g
              data-layer="risers"
              data-spine-motion="true"
              data-testid="spine-diagram-layer"
            >
              <path d="M7 18v28l25 14 25-14V18M32 32v28" />
            </g>
            <g
              data-layer="faces"
              data-spine-motion="true"
              data-testid="spine-diagram-layer"
            >
              <path d="m19.5 11 25 14v28M44.5 11l-25 14v28" />
              <path d="M7 32 32 46 57 32" />
            </g>
          </svg>
        </div>
      </aside>

      <div
        ref={backgroundRef}
        className={styles.carton}
        data-help-dialog-background="true"
      >
        <a className={styles.skipLink} href="#cube-stage">
          {dictionary.skipToCube}
        </a>

        <ExperienceHeader
          dictionary={dictionary}
          locale={locale}
          onLocaleChange={handleLocaleChange}
          purchaseHref={purchaseHref}
        />

        <div className={styles.workspace} data-testid="workspace">
          <PlanDrawing dictionary={dictionary} />

          <HeroCopy
            dictionary={dictionary}
            disabled={controlsLocked}
            onScramble={startScramble}
          />

          <section
            aria-label={dictionary.stageLabel}
            className={styles.stage}
            data-celebrating={String(celebrationActive)}
            id="cube-stage"
            tabIndex={-1}
          >
            <div
              aria-hidden="true"
              className={styles.groundShadow}
              data-testid="cube-ground-shadow"
            />
            <div className={styles.cubeFrame} data-testid="cube-frame">
              <CubeCanvas
                cube={state.cube}
                introPhase={introPhase}
                isCelebrating={celebrationActive}
                locale={locale}
                onCursorIntentChange={handleCursorIntentChange}
                onInteractionLockChange={setSceneInteracting}
                onDropComplete={markDropComplete}
                onMoveComplete={confirmMove}
                onMoveRequest={queueMove}
                onSceneError={handleSceneError}
                onSceneReady={markSceneReady}
                purchaseHref={purchaseHref}
                queue={state.queue}
              />
            </div>
            <SuccessMoment
              dictionary={dictionary}
              isOpen={successOpen}
              onDismiss={() => {
                setCelebrationActive(false);
                setSuccessOpen(false);
              }}
              onReset={resetFromSuccess}
              purchaseHref={purchaseHref}
            />
          </section>

          <LiveTelemetry
            dictionary={dictionary}
            motionPaused={motionPaused}
            snapshot={telemetry}
          />

          <ControlDock
            dictionary={dictionary}
            disabled={controlsLocked}
            helpTriggerRef={helpTriggerRef}
            onHelp={() => setHelpOpen(true)}
            onMove={queueMove}
            onReset={reset}
            onScramble={startScramble}
            onUndo={undo}
            undoAvailable={state.userHistory.length > 0}
          />
        </div>

        <PurchaseLink className={styles.mobilePurchase} href={purchaseHref}>
          {dictionary.purchase}
        </PurchaseLink>

        <div
          aria-atomic="true"
          aria-live="polite"
          className={styles.srOnly}
          data-testid="experience-announcer"
        >
          {announcementText(announcement, dictionary)}
        </div>
      </div>

      <HelpDialog
        backgroundRef={backgroundRef}
        dictionary={dictionary}
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        triggerRef={helpTriggerRef}
      />
      <AdaptiveCursor
        intent={cursorIntent}
        onMounted={setCustomCursorMounted}
        paused={introLocked}
      />
    </main>
  );
}

function announcementForConfirmedMove(
  scramble: {
    readonly confirmed: number;
    readonly total: number;
  },
  queued: QueuedMove,
): Announcement {
  if (
    queued.origin === "scramble" &&
    scramble.confirmed + 1 === scramble.total
  ) {
    return { kind: "scramble" };
  }

  return { kind: "move", move: queued.move };
}

function announcementText(
  announcement: Announcement,
  dictionary: (typeof dictionaries)[keyof typeof dictionaries],
): string {
  if (!announcement) {
    return "";
  }
  if (announcement.kind === "move") {
    return `${dictionary.moveConfirmed}: ${formatMoveName(
      announcement.move,
      dictionary,
    )}.`;
  }
  if (announcement.kind === "scramble") {
    return dictionary.scrambleComplete;
  }
  if (announcement.kind === "reset") {
    return dictionary.resetComplete;
  }
  if (announcement.kind === "error") {
    return dictionary.sceneErrorAnnouncement;
  }
  return dictionary.success;
}

function PlanDrawing({
  dictionary,
}: {
  readonly dictionary: (typeof dictionaries)[keyof typeof dictionaries];
}) {
  return (
    <svg
      aria-hidden="true"
      className={styles.planDrawing}
      data-testid="packaging-plan"
      viewBox="100 40 900 480"
    >
      <g transform="rotate(-5 550 270)">
        <g className={styles.planPanels}>
          <rect x="190" y="190" width="180" height="180" />
          <rect x="370" y="190" width="180" height="180" />
          <rect x="550" y="190" width="180" height="180" />
          <rect x="730" y="190" width="180" height="180" />
        </g>

        <g className={styles.planCutLines}>
          <path
            d="M550 190 562 95Q564 78 581 76H700Q717 78 719 95L730 190"
            data-testid="plan-copy-clear-upper-curve"
          />
          <path d="M730 190 744 129Q747 114 762 112H894Q908 115 910 130L910 190" />
          <path d="M190 370 177 432Q174 447 190 452L351 452Q367 449 370 433L370 370" />
          <path d="M370 370 386 488Q389 504 405 506H519Q535 504 538 488L550 370" />
          <path d="M550 370 563 461Q566 477 582 479H698Q715 477 718 461L730 370" />
          <path d="M730 370 744 432Q747 447 763 451L893 451Q908 447 910 432L910 370" />
          <path d="M190 370 128 378Q111 380 108 397V438Q111 454 128 456L190 452" />
          <path d="M910 190 970 205Q984 209 986 225V336Q983 351 968 356L910 370" />
        </g>

        <g className={styles.planFoldLines}>
          <path d="M370 190H910M190 370H910" />
          <path d="M370 190V370M550 190V370M730 190V370M910 190V370" />
        </g>

        <g className={styles.planProductMark}>
          <text x="430" y="270">CUBO 3D</text>
          <text className={styles.planCopy} x="432" y="292">
            {dictionary.planTagline}
          </text>
        </g>

        <g className={styles.planCubeMark} transform="translate(500 315)">
          <path d="M28 0 54 15 28 30 2 15 28 0Z" />
          <path d="M2 15v30l26 15 26-15V15M28 30v30" />
          <path d="M15 7.5 41 22.5v30M41 7.5 15 22.5v30" />
          <path d="M2 30 28 45 54 30" />
        </g>

        <g className={styles.planDotMatrix}>
          {Array.from({ length: 42 }, (_, index) => (
            <circle
              key={index}
              cx={218 + (index % 7) * 15}
              cy={385 + Math.floor(index / 7) * 15}
              r="4.2"
            />
          ))}
        </g>

        <g className={styles.planRegistration}>
          <g
            className={styles.planRegistrationMotion}
            data-testid="plan-registration-motion"
          >
            <g
              data-testid="plan-copy-clear-registration"
              transform="translate(321 0)"
            >
              <path d="M110 82h36M128 64v36" />
              <circle cx="128" cy="82" r="8" />
            </g>
          </g>
          <path d="M954 414h36M972 396v36" />
          <circle cx="972" cy="414" r="8" />
        </g>
      </g>
    </svg>
  );
}
