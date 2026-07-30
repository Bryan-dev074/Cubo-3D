"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import { CubeCanvas } from "@/components/cube/CubeCanvas";
import { ControlDock } from "@/components/experience/ControlDock";
import { ExperienceHeader } from "@/components/experience/ExperienceHeader";
import { HelpDialog } from "@/components/experience/HelpDialog";
import { HeroCopy } from "@/components/experience/HeroCopy";
import {
  LiveTelemetry,
  formatMoveName,
} from "@/components/experience/LiveTelemetry";
import { PurchaseLink } from "@/components/experience/PurchaseLink";
import { SuccessMoment } from "@/components/experience/SuccessMoment";
import { useLocale } from "@/components/experience/useLocale";
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
import { buildWhatsAppUrl } from "@/lib/whatsapp";

import styles from "./experience.module.css";

type Announcement =
  | { readonly kind: "move"; readonly move: CubeMove }
  | { readonly kind: "scramble" }
  | { readonly kind: "reset" }
  | { readonly kind: "error" }
  | { readonly kind: "success" }
  | null;

export function MagicCubeExperience() {
  const [locale, setLocale] = useLocale();
  const dictionary = dictionaries[locale];
  const [state, dispatch] = useReducer(
    gameReducer,
    undefined,
    createInitialGameState,
  );
  const [isSceneInteracting, setSceneInteracting] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [celebrationActive, setCelebrationActive] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const helpTriggerRef = useRef<HTMLButtonElement>(null);
  const moveRequestClaimedRef = useRef(false);
  const purchaseHref = useMemo(() => buildWhatsAppUrl(locale), [locale]);
  const activeMove = selectActiveMove(state);
  const telemetry = useMemo(
    () => createTelemetrySnapshot(state, activeMove),
    [activeMove, state],
  );
  const isAnimating = state.queue.length > 0;
  const controlsLocked = isAnimating || isSceneInteracting;
  const handleSceneError = useCallback(
    () => setAnnouncement({ kind: "error" }),
    [],
  );

  useEffect(() => {
    if (!celebrationActive) {
      return;
    }

    const timer = window.setTimeout(
      () => setCelebrationActive(false),
      CELEBRATION_DURATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, [celebrationActive]);

  const queueMove = (move: CubeMove) => {
    // A gesture owns its release while onInteractionLockChange is true. Queue
    // length plus the synchronous claim prevent two requests in one event from
    // entering before React publishes the queued state.
    if (
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
      id="cubo"
    >
      <aside
        aria-hidden="true"
        className={styles.cobaltSpine}
        data-testid="editorial-spine"
      >
        <div className={styles.spineIntro}>
          <strong>{dictionary.spineTitle}</strong>
          <span>{dictionary.spineTagline}</span>
        </div>

        <strong aria-hidden="true" className={styles.spineWordmark}>
          CUBO 3D
        </strong>

        <div className={styles.spineFooter}>
          <strong>{dictionary.spineProduct}</strong>
          <span>{dictionary.spinePlay}</span>
          <span>{dictionary.spineEngineering}</span>
          <span>{dictionary.spinePrecision}</span>
          <svg
            aria-hidden="true"
            className={styles.spineDiagram}
            data-testid="spine-diagram"
            viewBox="0 0 64 64"
          >
            <path d="M32 4 57 18 32 32 7 18 32 4Z" />
            <path d="M7 18v28l25 14 25-14V18M32 32v28" />
            <path d="m19.5 11 25 14v28M44.5 11l-25 14v28" />
            <path d="M7 32 32 46 57 32" />
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
          onLocaleChange={setLocale}
          purchaseHref={purchaseHref}
        />

        <div className={styles.workspace}>
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
            <PlanDrawing />
            <div className={styles.cubeFrame}>
              <CubeCanvas
                cube={state.cube}
                isCelebrating={celebrationActive}
                locale={locale}
                onInteractionLockChange={setSceneInteracting}
                onMoveComplete={confirmMove}
                onMoveRequest={queueMove}
                onSceneError={handleSceneError}
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
            pauseMotion={isSceneInteracting || isAnimating || successOpen}
            snapshot={telemetry}
          />

          <ControlDock
            dictionary={dictionary}
            disabled={controlsLocked}
            helpTriggerRef={helpTriggerRef}
            onHelp={() => setHelpOpen(true)}
            onMove={queueMove}
            onReset={reset}
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

function PlanDrawing() {
  return (
    <svg
      aria-hidden="true"
      className={styles.planDrawing}
      viewBox="0 0 900 620"
    >
      <path d="M78 402 221 318 342 351 462 240 684 258 817 369 736 528 512 497 408 582 253 516 117 548Z" />
      <path d="M221 318 253 516M342 351 408 582M462 240 512 497M684 258 736 528" />
      <path d="M117 548 78 402 29 432 47 521Z" />
      <path d="M736 528 817 369 873 410 829 510Z" />
      <circle cx="54" cy="62" r="9" />
      <path d="M54 36v52M28 62h52" />
      <circle cx="844" cy="74" r="9" />
      <path d="M844 48v52M818 74h52" />
    </svg>
  );
}
