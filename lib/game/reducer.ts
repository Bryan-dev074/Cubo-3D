import { applyMove, inverseMove } from "@/lib/cube/moves";
import { isSolved } from "@/lib/cube/solved";
import { createSolvedCube } from "@/lib/cube/state";
import type { CubeMove, CubieState } from "@/lib/cube/types";

export type MoveOrigin = "user" | "scramble" | "undo";

export interface QueuedMove {
  readonly move: CubeMove;
  readonly origin: MoveOrigin;
}

export interface ScrambleLifecycle {
  readonly total: number;
  readonly confirmed: number;
  readonly completed: boolean;
  readonly valid: boolean;
}

export interface GameState {
  readonly cube: readonly CubieState[];
  readonly queue: readonly QueuedMove[];
  readonly userHistory: readonly CubeMove[];
  readonly confirmedUserMoves: number;
  readonly lastConfirmedMove: CubeMove | null;
  readonly scramble: ScrambleLifecycle;
  readonly celebrationEmitted: boolean;
}

export type GameAction =
  | { readonly type: "queue-move"; readonly move: CubeMove }
  | { readonly type: "confirm-move" }
  | { readonly type: "start-scramble"; readonly moves: readonly CubeMove[] }
  | { readonly type: "undo" }
  | { readonly type: "reset" }
  | { readonly type: "mark-celebrated" };

const EMPTY_SCRAMBLE: ScrambleLifecycle = Object.freeze({
  total: 0,
  confirmed: 0,
  completed: false,
  valid: false,
});

export function createInitialGameState(): GameState {
  return freezeState({
    cube: createSolvedCube(),
    queue: [],
    userHistory: [],
    confirmedUserMoves: 0,
    lastConfirmedMove: null,
    scramble: EMPTY_SCRAMBLE,
    celebrationEmitted: false,
  });
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "queue-move":
      return freezeState({
        ...state,
        queue: [...state.queue, createQueuedMove(action.move, "user")],
      });

    case "confirm-move":
      return confirmActiveMove(state);

    case "start-scramble":
      if (state.queue.length > 0) {
        return state;
      }

      return freezeState({
        cube: state.cube,
        queue: action.moves.map((move) => createQueuedMove(move, "scramble")),
        userHistory: [],
        confirmedUserMoves: 0,
        lastConfirmedMove: null,
        scramble: {
          total: action.moves.length,
          confirmed: 0,
          completed: action.moves.length === 0,
          valid: false,
        },
        celebrationEmitted: false,
      });

    case "undo": {
      const previousMove = state.userHistory.at(-1);
      if (!previousMove || state.queue.length > 0) {
        return state;
      }

      return freezeState({
        ...state,
        queue: [createQueuedMove(inverseMove(previousMove), "undo")],
      });
    }

    case "reset":
      return createInitialGameState();

    case "mark-celebrated":
      if (state.celebrationEmitted) {
        return state;
      }

      return freezeState({ ...state, celebrationEmitted: true });
  }
}

function confirmActiveMove(state: GameState): GameState {
  const active = state.queue[0];
  if (!active) {
    return state;
  }

  const cube = applyMove(state.cube, active.move);
  const queue = state.queue.slice(1);
  let userHistory = state.userHistory;
  let confirmedUserMoves = state.confirmedUserMoves;
  let scramble = state.scramble;

  if (active.origin === "user") {
    userHistory = [...state.userHistory, active.move];
    confirmedUserMoves += 1;
  } else if (active.origin === "undo") {
    userHistory = state.userHistory.slice(0, -1);
    confirmedUserMoves = Math.max(0, confirmedUserMoves - 1);
  } else {
    const confirmed = state.scramble.confirmed + 1;
    const completed = confirmed === state.scramble.total;
    scramble = {
      ...state.scramble,
      confirmed,
      completed,
      valid: completed && !isSolved(cube),
    };
  }

  return freezeState({
    ...state,
    cube,
    queue,
    userHistory,
    confirmedUserMoves,
    lastConfirmedMove: active.move,
    scramble,
  });
}

function createQueuedMove(move: CubeMove, origin: MoveOrigin): QueuedMove {
  return Object.freeze({
    move: Object.freeze({ ...move }),
    origin,
  });
}

function freezeState(state: GameState): GameState {
  return Object.freeze({
    ...state,
    queue: Object.freeze([...state.queue]),
    userHistory: Object.freeze([...state.userHistory]),
    scramble: Object.freeze({ ...state.scramble }),
  });
}
