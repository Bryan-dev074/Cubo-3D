"use client";

import {
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";

import { LAYER_NOTATION } from "@/lib/cube/notation";
import type { Axis, AxisValue, CubeMove } from "@/lib/cube/types";
import type { CubeTelemetry } from "@/lib/game/telemetry";
import type { Dictionary } from "@/lib/i18n/types";

import styles from "./experience.module.css";

interface LiveTelemetryProps {
  readonly dictionary: Dictionary;
  readonly pauseMotion?: boolean;
  readonly snapshot: CubeTelemetry;
}

const AXES: readonly Axis[] = ["x", "y", "z"];
const LAYERS: readonly AxisValue[] = [-1, 0, 1];

export function LiveTelemetry({
  dictionary,
  pauseMotion = false,
  snapshot,
}: LiveTelemetryProps) {
  const pageVisible = usePageVisibility();
  const reducedMotion = useReducedMotion();
  const mobileLayout = useMobileLayout();
  const motionPaused = pauseMotion || !pageVisible || reducedMotion;
  const status = statusLabel(snapshot.statusKey, dictionary);
  const scrambleTotal = snapshot.scrambleProgress.total || 20;
  const scrambleValue = `${snapshot.scrambleProgress.confirmed} / ${scrambleTotal}`;

  return (
    <aside
      className={styles.telemetry}
      data-motion-paused={String(motionPaused)}
      data-testid="live-telemetry"
    >
      <div
        aria-label={dictionary.telemetrySummary}
        className={styles.mobileTelemetrySummary}
        role="group"
      >
        <TelemetrySummaryValue
          label={dictionary.telemetryMoves}
          testId="telemetry-move-count"
          value={String(snapshot.confirmedUserMoves)}
        />
        <TelemetrySummaryValue
          label={dictionary.telemetryState}
          value={status}
        />
        <TelemetrySummaryValue
          label={dictionary.telemetryScramble}
          testId="telemetry-scramble-progress"
          value={scrambleValue}
        />
      </div>

      <details
        aria-label={dictionary.telemetryFull}
        className={styles.telemetryDisclosure}
        data-mobile-expandable="true"
        open={!mobileLayout}
        role="group"
      >
        <summary>{dictionary.telemetryExpand}</summary>
        <div className={styles.fullInstrument}>
          <TelemetryField label={dictionary.telemetryPieces}>
            <ul
              aria-hidden="true"
              className={styles.pieceMatrix}
              data-active-count={snapshot.activePieceIds.length}
            >
              {snapshot.pieceIds.map((pieceId, index) => {
                const active = snapshot.activePieceIds.includes(pieceId);
                return (
                  <li
                    key={pieceId}
                    className={styles.pieceCell}
                    data-piece-active={String(active)}
                    data-piece-cue={active ? "ring" : "none"}
                    style={{ "--scan-index": index } as CSSProperties}
                  />
                );
              })}
            </ul>
            <span className={styles.instrumentValue}>
              {snapshot.pieceCount}
            </span>
          </TelemetryField>

          <TelemetryField label={dictionary.telemetryLayers}>
            <div aria-hidden="true" className={styles.layerDiagram}>
              {AXES.flatMap((axis) =>
                LAYERS.map((layer) => {
                  const active =
                    snapshot.activeLayer?.axis === axis &&
                    snapshot.activeLayer.layer === layer;
                  return (
                    <span
                      key={`${axis}-${layer}`}
                      className={styles.layerCell}
                      data-layer-active={String(active)}
                      data-layer-axis={axis}
                      data-layer-value={layer}
                    />
                  );
                }),
              )}
            </div>
            <span className={styles.instrumentValue}>
              {snapshot.activeLayer
                ? `${snapshot.activeLayer.axis.toUpperCase()} ${signedLayer(
                    snapshot.activeLayer.layer,
                  )}`
                : snapshot.layerCount}
            </span>
          </TelemetryField>

          <TelemetryField label={dictionary.telemetryTurns}>
            <div
              aria-hidden="true"
              className={styles.turnDial}
              data-direction={snapshot.activeTurn?.direction ?? "idle"}
              data-testid="telemetry-turn-direction"
            >
              <span />
            </div>
            <span
              className={styles.instrumentValue}
              data-testid="telemetry-turn-value"
            >
              {turnValue(snapshot)}
            </span>
          </TelemetryField>

          <TelemetryField label={dictionary.telemetryMoves}>
            <span
              key={snapshot.confirmedUserMoves}
              className={`${styles.instrumentValue} ${styles.moveNumber}`}
              data-testid="telemetry-move-count-full"
            >
              {snapshot.confirmedUserMoves}
            </span>
          </TelemetryField>

          <TelemetryField label={dictionary.telemetryLastMove}>
            <span
              className={styles.textValue}
              data-testid="telemetry-last-move"
            >
              {snapshot.lastConfirmedMove
                ? formatMoveName(snapshot.lastConfirmedMove, dictionary)
                : dictionary.noMoves}
            </span>
          </TelemetryField>

          <TelemetryField label={dictionary.telemetryState}>
            <span className={styles.statusValue}>
              <span aria-hidden="true" className={styles.statusDot} />
              {status}
            </span>
          </TelemetryField>

          <TelemetryField label={dictionary.telemetryScramble}>
            <span
              className={styles.instrumentValue}
              data-testid="telemetry-scramble-progress-full"
            >
              {scrambleValue}
            </span>
            <progress
              aria-label={`${dictionary.telemetryScramble}: ${scrambleValue}`}
              max={scrambleTotal}
              value={snapshot.scrambleProgress.confirmed}
            />
          </TelemetryField>
        </div>
      </details>

      <p className={styles.srOnly}>
        {dictionary.telemetryMoves}: {snapshot.confirmedUserMoves}.{" "}
        {dictionary.telemetryState}: {status}. {dictionary.telemetryScramble}:{" "}
        {scrambleValue}.
      </p>
    </aside>
  );
}

export function formatMoveName(
  move: CubeMove,
  dictionary: Dictionary,
): string {
  const layer = LAYER_NOTATION.find(
    (candidate) =>
      candidate.axis === move.axis && candidate.layer === move.layer,
  );
  if (!layer) {
    return dictionary.noMoves;
  }

  const labels = {
    right: dictionary.faceRight,
    left: dictionary.faceLeft,
    up: dictionary.faceUp,
    down: dictionary.faceDown,
    front: dictionary.faceFront,
    back: dictionary.faceBack,
    middle: dictionary.faceMiddle,
    equator: dictionary.faceEquator,
    standing: dictionary.faceStanding,
  };

  if (move.turns === 2) {
    return `${labels[layer.id]} 180°`;
  }

  const direction =
    move.turns === layer.clockwiseTurns
      ? dictionary.directionClockwise
      : dictionary.directionCounterclockwise;
  return `${labels[layer.id]} ${direction}`;
}

function TelemetryField({
  children,
  label,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) {
  return (
    <section className={styles.telemetryField}>
      <h2>{label}</h2>
      <div className={styles.telemetryFieldBody}>{children}</div>
    </section>
  );
}

function TelemetrySummaryValue({
  label,
  testId,
  value,
}: {
  readonly label: string;
  readonly testId?: string;
  readonly value: string;
}) {
  return (
    <div>
      <span>{label}</span>
      <strong data-testid={testId}>{value}</strong>
    </div>
  );
}

function statusLabel(
  status: CubeTelemetry["statusKey"],
  dictionary: Dictionary,
): string {
  if (status === "scrambling") {
    return dictionary.statusScrambling;
  }
  if (status === "playing") {
    return dictionary.statusPlaying;
  }
  if (status === "solved") {
    return dictionary.statusSolved;
  }
  return dictionary.statusReady;
}

function turnValue(snapshot: CubeTelemetry): string {
  if (!snapshot.activeTurn) {
    return "90°";
  }
  const sign = snapshot.activeTurn.direction === "negative" ? "-" : "+";
  return `${sign}${snapshot.activeTurn.degrees}°`;
}

function signedLayer(layer: AxisValue): string {
  return layer > 0 ? `+${layer}` : String(layer);
}

function usePageVisibility(): boolean {
  return useSyncExternalStore(
    subscribeToPageVisibility,
    readPageVisibility,
    readServerPageVisibility,
  );
}

function subscribeToPageVisibility(onStoreChange: () => void): () => void {
  document.addEventListener("visibilitychange", onStoreChange);
  return () =>
    document.removeEventListener("visibilitychange", onStoreChange);
}

function readPageVisibility(): boolean {
  return document.visibilityState !== "hidden";
}

function readServerPageVisibility(): boolean {
  return true;
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    readReducedMotion,
    readServerMediaPreference,
  );
}

function useMobileLayout(): boolean {
  return useSyncExternalStore(
    subscribeToMobileLayout,
    readMobileLayout,
    readServerMediaPreference,
  );
}

function subscribeToReducedMotion(onStoreChange: () => void): () => void {
  return subscribeToMediaQuery(
    "(prefers-reduced-motion: reduce)",
    onStoreChange,
  );
}

function subscribeToMobileLayout(onStoreChange: () => void): () => void {
  return subscribeToMediaQuery("(max-width: 700px)", onStoreChange);
}

function subscribeToMediaQuery(
  query: string,
  onStoreChange: () => void,
): () => void {
  if (typeof window.matchMedia !== "function") {
    return () => undefined;
  }
  const media = window.matchMedia(query);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function readReducedMotion(): boolean {
  return readMediaQuery("(prefers-reduced-motion: reduce)");
}

function readMobileLayout(): boolean {
  return readMediaQuery("(max-width: 700px)");
}

function readMediaQuery(query: string): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia(query).matches
  );
}

function readServerMediaPreference(): boolean {
  return false;
}
