import { describe, expect, it } from "vitest";

import { applyMove, inverseMove } from "@/lib/cube/moves";
import { createSolvedCube } from "@/lib/cube/state";
import type { CubieState } from "@/lib/cube/types";

describe("exact cubie state", () => {
  it("creates the 26 distinct cubies surrounding the absent core", () => {
    const cube = createSolvedCube();
    const positions = cube.map((cubie) => cubie.position);

    expect(cube).toHaveLength(26);
    expect(new Set(cube.map((cubie) => cubie.id)).size).toBe(26);
    expect(new Set(positions.map((position) => position.join(","))).size).toBe(26);
    expect(positions).not.toContainEqual([0, 0, 0]);
    expect(positions.every((position) => position.every(Number.isInteger))).toBe(true);
  });

  it("returns a new state and restores every cubie with a move plus its inverse", () => {
    const solved = createSolvedCube();
    const move = { axis: "x" as const, layer: 1 as const, turns: 1 as const };
    const turned = applyMove(solved, move);

    expect(turned).not.toBe(solved);
    expect(turned.find((cubie) => cubie.id === "1,1,1")?.position).toEqual([1, -1, 1]);
    expect(applyMove(turned, inverseMove(move))).toEqual(solved);
  });

  it("restores a face after four quarter turns", () => {
    const move = { axis: "z" as const, layer: -1 as const, turns: 1 as const };
    const cube = createSolvedCube();
    const rotated = Array.from({ length: 4 }).reduce<readonly CubieState[]>(
      (state) => applyMove(state, move),
      cube,
    );

    expect(rotated).toEqual(cube);
  });

  it("applies half turns and rotates only the requested central slice", () => {
    const cube = createSolvedCube();
    const rotated = applyMove(cube, { axis: "y", layer: 0, turns: 2 });

    expect(rotated.find((cubie) => cubie.id === "1,0,1")?.position).toEqual([-1, 0, -1]);
    expect(rotated.find((cubie) => cubie.id === "1,1,1")?.position).toEqual([1, 1, 1]);
    expect(rotated.find((cubie) => cubie.id === "0,1,0")?.position).toEqual([0, 1, 0]);
  });
});
