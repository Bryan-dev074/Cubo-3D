"use client";

import {
  useCallback,
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
  const [announcement, setAnnouncement] = useState<Announcement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const helpTriggerRef = useRef<HTMLButtonElement>(null);
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

  const queueMove = (move: CubeMove) => {
    // A gesture owns its release while onInteractionLockChange is true. Queue
    // length, rather than the parent interaction lock, is the concurrency gate.
    if (state.queue.length === 0) {
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
    dispatch({ type: "confirm-move" });
    if (willCelebrate) {
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
    setAnnouncement(null);
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
    setSuccessOpen(false);
    setAnnouncement({ kind: "reset" });
  };

  const resetFromSuccess = () => {
    dispatch({ type: "reset" });
    setSuccessOpen(false);
    setAnnouncement({ kind: "reset" });
  };

  return (
    <main
      aria-labelledby="experience-title"
      className={styles.experience}
      id="cubo"
    >
      <aside aria-hidden="true" className={styles.cobaltSpine}>
        <span>CUBO 3D</span>
      </aside>

      <div ref={backgroundRef} className={styles.carton}>
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
            data-celebrating={String(successOpen)}
          >
            <PlanDrawing />
            <div className={styles.cubeFrame}>
              <CubeCanvas
                cube={state.cube}
                isCelebrating={successOpen}
                locale={locale}
                onInteractionLockChange={setSceneInteracting}
                onMoveComplete={confirmMove}
                onMoveRequest={queueMove}
                onSceneError={handleSceneError}
                purchaseHref={purchaseHref}
                queue={state.queue}
              />
            </div>
            <p className={styles.firstUseHint}>{dictionary.help}</p>
            <SuccessMoment
              dictionary={dictionary}
              isOpen={successOpen}
              onDismiss={() => setSuccessOpen(false)}
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
            onUndo={() => dispatch({ type: "undo" })}
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
