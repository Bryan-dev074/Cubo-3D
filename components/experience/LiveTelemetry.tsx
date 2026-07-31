"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { LAYER_NOTATION } from "@/lib/cube/notation";
import type { Axis, AxisValue, CubeMove } from "@/lib/cube/types";
import type { CubeTelemetry } from "@/lib/game/telemetry";
import type { Dictionary } from "@/lib/i18n/types";

import styles from "./experience.module.css";

interface LiveTelemetryProps {
  readonly dictionary: Dictionary;
  readonly motionPaused: boolean;
  readonly snapshot: CubeTelemetry;
}

const AXES: readonly Axis[] = ["x", "y", "z"];
const LAYERS: readonly AxisValue[] = [-1, 0, 1];

export function LiveTelemetry({
  dictionary,
  motionPaused,
  snapshot,
}: LiveTelemetryProps) {
  const disclosureRef = useRef<HTMLDetailsElement>(null);
  const status = statusLabel(snapshot.statusKey, dictionary);
  const scrambleTotal = snapshot.scrambleProgress.total || 20;
  const scrambleValue = `${snapshot.scrambleProgress.confirmed} / ${scrambleTotal}`;

  useEffect(() => {
    const disclosure = disclosureRef.current;
    if (!disclosure) {
      return;
    }
    if (typeof window.matchMedia !== "function") {
      disclosure.open = true;
      return;
    }

    const mobile = window.matchMedia("(max-width: 900px)");
    const syncViewportSemantics = () => {
      disclosure.open = !mobile.matches;
    };
    syncViewportSemantics();
    mobile.addEventListener("change", syncViewportSemantics);
    return () =>
      mobile.removeEventListener("change", syncViewportSemantics);
  }, []);

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
        ref={disclosureRef}
        aria-label={dictionary.telemetryFull}
        className={styles.telemetryDisclosure}
        data-mobile-expandable="true"
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
              {snapshot.pieceIds.map((pieceId) => {
                const active = snapshot.activePieceIds.includes(pieceId);
                return (
                  <li
                    key={pieceId}
                    className={styles.pieceCell}
                    data-piece-active={String(active)}
                    data-piece-cue={active ? "ring" : "none"}
                  />
                );
              })}
            </ul>
            <span className={styles.instrumentValue}>
              {snapshot.pieceCount}
            </span>
          </TelemetryField>

          <TelemetryField label={dictionary.telemetryLayers}>
            <LayerDiagram snapshot={snapshot} />
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
              data-testid="turn-dial"
            >
              <span
                className={styles.turnDialArrow}
                data-direction={snapshot.activeTurn?.direction ?? "idle"}
                data-testid="telemetry-turn-direction"
              >
                <i />
              </span>
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
              aria-valuemax={scrambleTotal}
              aria-valuemin={0}
              aria-valuenow={snapshot.scrambleProgress.confirmed}
              data-testid="mix-meter"
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

function LayerDiagram({
  snapshot,
}: {
  readonly snapshot: CubeTelemetry;
}) {
  return (
    <svg
      aria-hidden="true"
      className={styles.layerDiagram}
      data-testid="layer-diagram"
      viewBox="0 0 112 88"
    >
      <g className={styles.layerPlanes}>
        {AXES.flatMap((axis) =>
          LAYERS.map((layer, index) => {
            const active =
              snapshot.activeLayer?.axis === axis &&
              snapshot.activeLayer.layer === layer;
            return (
              <path
                key={`${axis}-${layer}`}
                d={layerPlanePath(axis, index)}
                data-layer-active={String(active)}
                data-layer-axis={axis}
                data-layer-value={layer}
              />
            );
          }),
        )}
      </g>
      <g className={styles.layerWireframe}>
        <path d="M20 20 42 8H92L70 20Z" />
        <path d="M70 20 92 8V58L70 70Z" />
        <rect x="20" y="20" width="50" height="50" />
        <path d="M36.67 20V70M53.33 20V70M20 36.67H70M20 53.33H70" />
        <path d="M27.33 16H77.33M34.67 12H84.67M77.33 16V66M84.67 12V62" />
      </g>
    </svg>
  );
}

function layerPlanePath(axis: Axis, index: number): string {
  const third = 50 / 3;

  if (axis === "x") {
    const x = 20 + index * third;
    return `M${x} 20H${x + third}V70H${x}Z`;
  }

  if (axis === "y") {
    const y = 20 + index * third;
    return `M20 ${y}H70V${y + third}H20Z`;
  }

  const frontLeft = 20 + index * (22 / 3);
  const frontRight = 70 + index * (22 / 3);
  const backLeft = frontLeft + 22 / 3;
  const backRight = frontRight + 22 / 3;
  return `M${frontLeft} ${20 - index * 4}H${frontRight}L${backRight} ${
    16 - index * 4
  }H${backLeft}Z`;
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
