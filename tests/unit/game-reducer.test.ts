import { describe, expect, it } from "vitest";

import { inverseMove } from "@/lib/cube/moves";
import { generateScramble } from "@/lib/cube/scramble";
import { isSolved } from "@/lib/cube/solved";
import type { CubeMove } from "@/lib/cube/types";
import { createInitialGameState, gameReducer, type GameState } from "@/lib/game/reducer";
import { selectActiveMove, selectGameStatus, shouldCelebrate } from "@/lib/game/selectors";

const RIGHT: CubeMove = { axis: "x", layer: 1, turns: 1 };
const UP: CubeMove = { axis: "y", layer: 1, turns: -1 };
const INVALID_BASE = generateScramble({ length: 18, seed: 3301 });

function invalidScrambleAt(index: number, move: CubeMove): readonly CubeMove[] {
  return INVALID_BASE.map((candidate, candidateIndex) =>
    candidateIndex === index ? move : candidate,
  );
}

function confirmMoves(state: GameState, count: number): GameState {
  return Array.from({ length: count }).reduce<GameState>(
    (current) => gameReducer(current, { type: "confirm-move" }),
    state,
  );
}

function completeChallenge(seed: number): GameState {
  const scramble = generateScramble({ length: 18, seed });
  let state = gameReducer(createInitialGameState(), {
    type: "start-scramble",
    moves: scramble,
  });
  state = confirmMoves(state, scramble.length);

  for (const move of [...scramble].reverse().map(inverseMove)) {
    state = gameReducer(state, { type: "queue-move", move });
    state = gameReducer(state, { type: "confirm-move" });
  }

  return state;
}

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
    const scramble = generateScramble({ length: 18, seed: 3101 });
    let state = createInitialGameState();
    state = gameReducer(state, { type: "start-scramble", moves: scramble });

    expect(state.scramble).toEqual({
      total: 18,
      confirmed: 0,
      completed: false,
      valid: false,
    });
    expect(selectGameStatus(state)).toBe("scrambling");

    state = gameReducer(state, { type: "confirm-move" });
    expect(state.scramble.confirmed).toBe(1);
    expect(state.confirmedUserMoves).toBe(0);
    expect(state.lastConfirmedMove).toEqual(scramble[0]);

    state = confirmMoves(state, scramble.length - 1);
    expect(state.scramble).toEqual({
      total: 18,
      confirmed: 18,
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
    const scramble = generateScramble({ length: 18, seed: 3102 });

    const scrambleQueued = gameReducer(state, { type: "start-scramble", moves: scramble });

    expect(scrambleQueued.cube).toBe(cubeBeforeScramble);
    expect(scrambleQueued.queue[0]).toEqual({ move: scramble[0], origin: "scramble" });
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
    const scramble = generateScramble({ length: 18, seed: 3103 });
    let state = createInitialGameState();
    state = gameReducer(state, { type: "start-scramble", moves: scramble });
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
    const scramble = generateScramble({ length: 18, seed: 3201 });
    let state = createInitialGameState();
    expect(shouldCelebrate(state)).toBe(false);

    state = gameReducer(state, { type: "start-scramble", moves: scramble });
    expect(shouldCelebrate(state)).toBe(false);

    state = confirmMoves(state, scramble.length);
    expect(state.scramble.valid).toBe(true);
    expect(shouldCelebrate(state)).toBe(false);

    const solution = [...scramble].reverse().map(inverseMove);
    for (const move of solution.slice(0, -1)) {
      state = gameReducer(state, { type: "queue-move", move });
      state = gameReducer(state, { type: "confirm-move" });
      expect(shouldCelebrate(state)).toBe(false);
    }

    state = gameReducer(state, { type: "queue-move", move: solution.at(-1)! });
    expect(shouldCelebrate(state)).toBe(false);
    state = gameReducer(state, { type: "confirm-move" });
    expect(shouldCelebrate(state)).toBe(true);
    expect(selectGameStatus(state)).toBe("solved");
  });

  it("emits at most once per scramble cycle", () => {
    let state = completeChallenge(3202);

    expect(shouldCelebrate(state)).toBe(true);
    state = gameReducer(state, { type: "mark-celebrated" });
    expect(shouldCelebrate(state)).toBe(false);
  });

  it.each([
    {
      label: "too-short sequence",
      moves: [RIGHT],
      message: "Invalid scramble: expected 18 to 22 moves",
    },
    {
      label: "central layer",
      moves: invalidScrambleAt(0, { axis: "x", layer: 0, turns: 1 }),
      message: "Invalid scramble: external layers only",
    },
    {
      label: "half turn",
      moves: invalidScrambleAt(0, { axis: "x", layer: 1, turns: 2 }),
      message: "Invalid scramble: quarter turns only",
    },
    {
      label: "immediate inverse",
      moves: invalidScrambleAt(1, inverseMove(INVALID_BASE[0])),
      message: "Invalid scramble: immediate inverse",
    },
    {
      label: "repeated face",
      moves: invalidScrambleAt(1, INVALID_BASE[0]),
      message: "Invalid scramble: repeated face",
    },
    {
      label: "consecutive axis",
      moves: invalidScrambleAt(1, {
        axis: INVALID_BASE[0].axis,
        layer: INVALID_BASE[0].layer === 1 ? -1 : 1,
        turns: 1,
      }),
      message: "Invalid scramble: consecutive moves on the same axis",
    },
  ])("rejects a malformed $label before it can create a celebration cycle", ({ moves, message }) => {
    const initial = createInitialGameState();

    expect(() => gameReducer(initial, { type: "start-scramble", moves })).toThrow(message);
    expect(shouldCelebrate(initial)).toBe(false);
  });
});
