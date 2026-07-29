import { describe, expect, it } from "vitest";

import type { CubeMove } from "@/lib/cube/types";
import { createInitialGameState, gameReducer } from "@/lib/game/reducer";
import { createTelemetrySnapshot } from "@/lib/game/telemetry";

const RIGHT: CubeMove = { axis: "x", layer: 1, turns: 1 };
const MIDDLE: CubeMove = { axis: "x", layer: 0, turns: -1 };
const UP: CubeMove = { axis: "y", layer: 1, turns: -1 };

describe("createTelemetrySnapshot", () => {
  it("exposes the fixed piece/layer model and a locale-neutral ready status", () => {
    const snapshot = createTelemetrySnapshot(createInitialGameState());

    expect(snapshot.pieceCount).toBe(26);
    expect(snapshot.pieceIds).toHaveLength(26);
    expect(new Set(snapshot.pieceIds).size).toBe(26);
    expect(snapshot.layerCount).toBe(9);
    expect(snapshot.activeLayer).toBeNull();
    expect(snapshot.activePieceIds).toEqual([]);
    expect(snapshot.activeTurn).toBeNull();
    expect(snapshot.statusKey).toBe("ready");
  });

  it("reports 9 affected identifiers and the positive 90-degree direction for an outer layer", () => {
    const snapshot = createTelemetrySnapshot(createInitialGameState(), RIGHT);

    expect(snapshot.activeLayer).toEqual({ axis: "x", layer: 1 });
    expect(snapshot.activeTurn).toEqual({ degrees: 90, direction: "positive" });
    expect(snapshot.activePieceIds).toHaveLength(9);
    expect(snapshot.activePieceIds).toEqual([...snapshot.activePieceIds].sort());
  });

  it("reports 8 affected identifiers and the negative direction for a central layer", () => {
    const snapshot = createTelemetrySnapshot(createInitialGameState(), MIDDLE);

    expect(snapshot.activeLayer).toEqual({ axis: "x", layer: 0 });
    expect(snapshot.activeTurn).toEqual({ degrees: 90, direction: "negative" });
    expect(snapshot.activePieceIds).toHaveLength(8);
    expect(snapshot.activePieceIds).not.toContain("0,0,0");
  });

  it("reports actual scramble progress from confirmed and still-queued scramble moves", () => {
    let state = createInitialGameState();
    state = gameReducer(state, { type: "start-scramble", moves: [RIGHT, UP] });

    expect(createTelemetrySnapshot(state, RIGHT).scrambleProgress).toEqual({
      confirmed: 0,
      total: 2,
      remaining: 2,
    });

    state = gameReducer(state, { type: "confirm-move" });
    expect(createTelemetrySnapshot(state, UP).scrambleProgress).toEqual({
      confirmed: 1,
      total: 2,
      remaining: 1,
    });

    state = gameReducer(state, { type: "confirm-move" });
    expect(createTelemetrySnapshot(state).scrambleProgress).toEqual({
      confirmed: 2,
      total: 2,
      remaining: 0,
    });
    expect(createTelemetrySnapshot(state).statusKey).toBe("playing");
  });

  it("reports confirmed user count and the last confirmed move without counting scramble", () => {
    let state = createInitialGameState();
    state = gameReducer(state, { type: "start-scramble", moves: [RIGHT] });
    state = gameReducer(state, { type: "confirm-move" });

    let snapshot = createTelemetrySnapshot(state);
    expect(snapshot.confirmedUserMoves).toBe(0);
    expect(snapshot.lastConfirmedMove).toEqual(RIGHT);

    state = gameReducer(state, { type: "queue-move", move: UP });
    state = gameReducer(state, { type: "confirm-move" });
    snapshot = createTelemetrySnapshot(state);

    expect(snapshot.confirmedUserMoves).toBe(1);
    expect(snapshot.lastConfirmedMove).toEqual(UP);
  });

  it("returns immutable collections suitable for live consumers", () => {
    const snapshot = createTelemetrySnapshot(createInitialGameState(), RIGHT);

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.pieceIds)).toBe(true);
    expect(Object.isFrozen(snapshot.activePieceIds)).toBe(true);
    expect(Object.isFrozen(snapshot.scrambleProgress)).toBe(true);
  });
});
