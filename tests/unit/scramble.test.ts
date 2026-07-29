import { describe, expect, it } from "vitest";

import { applyMove, inverseMove } from "@/lib/cube/moves";
import { isSolved } from "@/lib/cube/solved";
import { generateScramble } from "@/lib/cube/scramble";
import { createSolvedCube } from "@/lib/cube/state";
import type { CubieState } from "@/lib/cube/types";

function applyMoves(moves: ReturnType<typeof generateScramble>): readonly CubieState[] {
  return moves.reduce<readonly CubieState[]>((cube, move) => applyMove(cube, move), createSolvedCube());
}

describe("generateScramble", () => {
  it("generates a deterministic 20-move external-layer scramble", () => {
    const first = generateScramble({ seed: 20260729 });
    const second = generateScramble({ seed: 20260729 });

    expect(first).toHaveLength(20);
    expect(second).toEqual(first);
    expect(first.every((move) => move.layer !== 0 && move.turns !== 2)).toBe(true);
    expect(isSolved(applyMoves(first))).toBe(false);
  });

  it.each([18, 19, 20, 21, 22])("supports a length of %i moves", (length) => {
    expect(generateScramble({ length, seed: length })).toHaveLength(length);
  });

  it.each([17, 23, 18.5])("rejects an unsupported length of %s", (length) => {
    expect(() => generateScramble({ length, seed: 1 })).toThrow(
      "Scramble length must be an integer from 18 to 22",
    );
  });

  it("rejects a non-integer seed", () => {
    expect(() => generateScramble({ seed: 1.5 })).toThrow("Scramble seed must be an integer");
  });

  it("avoids repeated faces, immediate inverses and consecutive moves on the same axis", () => {
    const moves = generateScramble({ length: 22, seed: 42 });

    for (let index = 1; index < moves.length; index += 1) {
      const previous = moves[index - 1];
      const current = moves[index];

      expect(current.axis).not.toBe(previous.axis);
      expect([current.axis, current.layer]).not.toEqual([previous.axis, previous.layer]);
      expect(current).not.toEqual(inverseMove(previous));
    }
  });
});
