import type { Axis, AxisValue, CubeMove } from "@/lib/cube/types";
import type { GameState } from "@/lib/game/reducer";
import { selectGameStatus } from "@/lib/game/selectors";

export interface ActiveLayerTelemetry {
  readonly axis: Axis;
  readonly layer: AxisValue;
}

export interface ActiveTurnTelemetry {
  readonly degrees: 90 | 180;
  readonly direction: "positive" | "negative";
}

export interface ScrambleProgressTelemetry {
  readonly confirmed: number;
  readonly total: number;
  readonly remaining: number;
}

export interface CubeTelemetry {
  readonly pieceCount: 26;
  readonly pieceIds: readonly string[];
  readonly layerCount: 9;
  readonly activeLayer: ActiveLayerTelemetry | null;
  readonly activePieceIds: readonly string[];
  readonly activeTurn: ActiveTurnTelemetry | null;
  readonly confirmedUserMoves: number;
  readonly lastConfirmedMove: CubeMove | null;
  readonly statusKey: ReturnType<typeof selectGameStatus>;
  readonly scrambleProgress: ScrambleProgressTelemetry;
}

export function createTelemetrySnapshot(
  state: GameState,
  activeMove?: CubeMove,
): CubeTelemetry {
  const pieceIds = Object.freeze(state.cube.map((cubie) => cubie.id).sort());
  const activePieceIds = Object.freeze(
    activeMove
      ? state.cube
          .filter((cubie) => cubie.position[axisIndex(activeMove.axis)] === activeMove.layer)
          .map((cubie) => cubie.id)
          .sort()
      : [],
  );
  const remainingScrambleMoves = state.queue.filter(
    (queuedMove) => queuedMove.origin === "scramble",
  ).length;

  return Object.freeze({
    pieceCount: 26,
    pieceIds,
    layerCount: 9,
    activeLayer: activeMove
      ? Object.freeze({ axis: activeMove.axis, layer: activeMove.layer })
      : null,
    activePieceIds,
    activeTurn: activeMove
      ? Object.freeze({
          degrees: activeMove.turns === 2 ? 180 : 90,
          direction: activeMove.turns === -1 ? "negative" : "positive",
        })
      : null,
    confirmedUserMoves: state.confirmedUserMoves,
    lastConfirmedMove: state.lastConfirmedMove,
    statusKey: selectGameStatus(state),
    scrambleProgress: Object.freeze({
      confirmed: Math.max(0, state.scramble.total - remainingScrambleMoves),
      total: state.scramble.total,
      remaining: remainingScrambleMoves,
    }),
  });
}

function axisIndex(axis: Axis): 0 | 1 | 2 {
  return axis === "x" ? 0 : axis === "y" ? 1 : 2;
}
