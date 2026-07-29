import { describe, expect, it } from "vitest";

import { inverseMove } from "@/lib/cube/moves";
import { isSolved } from "@/lib/cube/solved";
import type { CubeMove } from "@/lib/cube/types";
import { createInitialGameState, gameReducer } from "@/lib/game/reducer";
import { selectActiveMove, selectGameStatus, shouldCelebrate } from "@/lib/game/selectors";

const RIGHT: CubeMove = { axis: "x", layer: 1, turns: 1 };
const UP: CubeMove = { axis: "y", layer: 1, turns: -1 };

describe("gameReducer", () => {
  it("queues visual moves without changing logical cube state or history", () => {
    const initial = createInitialGameState();
    const queued = gameReducer(initial, { type: "queue-move", move: RIGHT });

    expect(queued.cube).toBe(initial.cube);
    expect(queued.userHistory).toEqual([]);
    expect(queued.confirmedUserMoves).toBe(0);
    expect(queued.queue).toEqual([{ move: RIGHT, origin: "user" }]);
    expect(selectActiveMove(queued)).toEqual(RIGHT);
  });

  it("confirms queued moves in FIFO order and only then advances user history", () => {
    let state = createInitialGameState();
    state = gameReducer(state, { type: "queue-move", move: RIGHT });
    state = gameReducer(state, { type: "queue-move", move: UP });

    const firstConfirmed = gameReducer(state, { type: "confirm-move" });
    expect(firstConfirmed.queue).toEqual([{ move: UP, origin: "user" }]);
    expect(firstConfirmed.userHistory).toEqual([RIGHT]);
    expect(firstConfirmed.confirmedUserMoves).toBe(1);
    expect(firstConfirmed.lastConfirmedMove).toEqual(RIGHT);
    expect(isSolved(firstConfirmed.cube)).toBe(false);

    const secondConfirmed = gameReducer(firstConfirmed, { type: "confirm-move" });
    expect(secondConfirmed.queue).toEqual([]);
    expect(secondConfirmed.userHistory).toEqual([RIGHT, UP]);
    expect(secondConfirmed.confirmedUserMoves).toBe(2);
  });

  it("tracks the real scramble lifecycle without counting scramble moves as user moves", () => {
    let state = createInitialGameState();
    state = gameReducer(state, { type: "start-scramble", moves: [RIGHT, UP] });

    expect(state.scramble).toEqual({
      total: 2,
      confirmed: 0,
      completed: false,
      valid: false,
    });
    expect(selectGameStatus(state)).toBe("scrambling");

    state = gameReducer(state, { type: "confirm-move" });
    expect(state.scramble.confirmed).toBe(1);
    expect(state.confirmedUserMoves).toBe(0);
    expect(state.lastConfirmedMove).toEqual(RIGHT);

    state = gameReducer(state, { type: "confirm-move" });
    expect(state.scramble).toEqual({
      total: 2,
      confirmed: 2,
      completed: true,
      valid: true,
    });
    expect(state.userHistory).toEqual([]);
    expect(state.confirmedUserMoves).toBe(0);
    expect(selectGameStatus(state)).toBe("playing");
  });

  it("preserves the logical cube until the first queued scramble move is confirmed", () => {
    let state = createInitialGameState();
    state = gameReducer(state, { type: "queue-move", move: RIGHT });
    state = gameReducer(state, { type: "confirm-move" });
    const cubeBeforeScramble = state.cube;

    const scrambleQueued = gameReducer(state, { type: "start-scramble", moves: [UP] });

    expect(scrambleQueued.cube).toBe(cubeBeforeScramble);
    expect(scrambleQueued.queue).toEqual([{ move: UP, origin: "scramble" }]);
  });

  it("queues and confirms the inverse of the last confirmed user move for undo", () => {
    let state = createInitialGameState();
    state = gameReducer(state, { type: "queue-move", move: RIGHT });
    state = gameReducer(state, { type: "confirm-move" });

    const undoQueued = gameReducer(state, { type: "undo" });
    expect(undoQueued.queue).toEqual([{ move: inverseMove(RIGHT), origin: "undo" }]);
    expect(undoQueued.userHistory).toEqual([RIGHT]);
    expect(undoQueued.confirmedUserMoves).toBe(1);

    const undone = gameReducer(undoQueued, { type: "confirm-move" });
    expect(isSolved(undone.cube)).toBe(true);
    expect(undone.userHistory).toEqual([]);
    expect(undone.confirmedUserMoves).toBe(0);
    expect(undone.lastConfirmedMove).toEqual(inverseMove(RIGHT));
  });

  it("ignores undo while a visual move is pending or no confirmed user move exists", () => {
    const initial = createInitialGameState();
    expect(gameReducer(initial, { type: "undo" })).toBe(initial);

    const queued = gameReducer(initial, { type: "queue-move", move: RIGHT });
    expect(gameReducer(queued, { type: "undo" })).toBe(queued);
  });

  it("resets to a fresh solved lifecycle with no queue, history or celebration", () => {
    let state = createInitialGameState();
    state = gameReducer(state, { type: "start-scramble", moves: [RIGHT] });
    state = gameReducer(state, { type: "confirm-move" });
    state = gameReducer(state, { type: "queue-move", move: inverseMove(RIGHT) });
    state = gameReducer(state, { type: "confirm-move" });
    state = gameReducer(state, { type: "mark-celebrated" });

    const reset = gameReducer(state, { type: "reset" });
    expect(isSolved(reset.cube)).toBe(true);
    expect(reset.queue).toEqual([]);
    expect(reset.userHistory).toEqual([]);
    expect(reset.lastConfirmedMove).toBeNull();
    expect(reset.confirmedUserMoves).toBe(0);
    expect(reset.celebrationEmitted).toBe(false);
    expect(reset.scramble).toEqual({
      total: 0,
      confirmed: 0,
      completed: false,
      valid: false,
    });
    expect(selectGameStatus(reset)).toBe("ready");
  });
});

describe("shouldCelebrate", () => {
  it("requires a valid completed scramble, a confirmed user move, an empty queue and solved cube", () => {
    let state = createInitialGameState();
    expect(shouldCelebrate(state)).toBe(false);

    state = gameReducer(state, { type: "start-scramble", moves: [RIGHT] });
    expect(shouldCelebrate(state)).toBe(false);

    state = gameReducer(state, { type: "confirm-move" });
    expect(state.scramble.valid).toBe(true);
    expect(shouldCelebrate(state)).toBe(false);

    state = gameReducer(state, { type: "queue-move", move: inverseMove(RIGHT) });
    expect(shouldCelebrate(state)).toBe(false);

    state = gameReducer(state, { type: "confirm-move" });
    expect(shouldCelebrate(state)).toBe(true);
    expect(selectGameStatus(state)).toBe("solved");
  });

  it("emits at most once per scramble cycle", () => {
    let state = createInitialGameState();
    state = gameReducer(state, { type: "start-scramble", moves: [RIGHT] });
    state = gameReducer(state, { type: "confirm-move" });
    state = gameReducer(state, { type: "queue-move", move: inverseMove(RIGHT) });
    state = gameReducer(state, { type: "confirm-move" });

    expect(shouldCelebrate(state)).toBe(true);
    state = gameReducer(state, { type: "mark-celebrated" });
    expect(shouldCelebrate(state)).toBe(false);
  });

  it("rejects a scramble cycle whose confirmed sequence finished solved", () => {
    let state = createInitialGameState();
    state = gameReducer(state, {
      type: "start-scramble",
      moves: [RIGHT, RIGHT, RIGHT, RIGHT],
    });

    for (let index = 0; index < 4; index += 1) {
      state = gameReducer(state, { type: "confirm-move" });
    }

    expect(state.scramble.completed).toBe(true);
    expect(state.scramble.valid).toBe(false);
    expect(shouldCelebrate(state)).toBe(false);
  });
});
