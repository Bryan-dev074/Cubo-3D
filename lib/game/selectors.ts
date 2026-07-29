import { isSolved } from "@/lib/cube/solved";
import type { CubeMove } from "@/lib/cube/types";
import type { GameState } from "@/lib/game/reducer";

export type GameStatusKey = "ready" | "scrambling" | "playing" | "solved";

export function selectActiveMove(state: GameState): CubeMove | undefined {
  return state.queue[0]?.move;
}

export function selectGameStatus(state: GameState): GameStatusKey {
  if (!state.scramble.completed && state.scramble.total > 0) {
    return "scrambling";
  }

  if (state.scramble.completed) {
    return state.confirmedUserMoves > 0 && isSolved(state.cube) ? "solved" : "playing";
  }

  return "ready";
}

export function shouldCelebrate(state: GameState): boolean {
  return (
    state.scramble.completed &&
    state.scramble.valid &&
    state.confirmedUserMoves > 0 &&
    state.queue.length === 0 &&
    isSolved(state.cube) &&
    !state.celebrationEmitted
  );
}
