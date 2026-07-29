import { describe, expect, it } from "vitest";

import { multiplyMatrices, rotationMatrix, transformVector } from "@/lib/cube/math";

describe("integer cube rotation math", () => {
  it("rotates vectors with exact signed-permutation matrices", () => {
    expect(transformVector(rotationMatrix("x", 1), [0, 1, 0])).toEqual([0, 0, 1]);
    expect(transformVector(rotationMatrix("y", 1), [1, 0, 0])).toEqual([0, 0, -1]);
    expect(transformVector(rotationMatrix("z", 1), [1, 0, 0])).toEqual([0, 1, 0]);
  });

  it("keeps composition exact for half and full turns", () => {
    const turn = rotationMatrix("z", 1);
    const halfTurn = multiplyMatrices(turn, turn);

    expect(halfTurn).toEqual(rotationMatrix("z", 2));
    expect(multiplyMatrices(halfTurn, halfTurn)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  });
});
