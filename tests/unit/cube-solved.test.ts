import { describe, expect, it } from "vitest";

import { rotationMatrix } from "@/lib/cube/math";
import { applyMove } from "@/lib/cube/moves";
import { isSolved } from "@/lib/cube/solved";
import { createSolvedCube } from "@/lib/cube/state";

describe("sticker-normal solved detection", () => {
  it("reports a moved slice as scrambled", () => {
    const scrambled = applyMove(createSolvedCube(), {
      axis: "x",
      layer: 1,
      turns: 1,
    });

    expect(isSolved(createSolvedCube())).toBe(true);
    expect(isSolved(scrambled)).toBe(false);
  });

  it("treats a face center rotated around its own sticker normal as solved", () => {
    const cube = createSolvedCube();
    const center = cube.find((cubie) => cubie.id === "0,0,1");
    if (!center) {
      throw new Error("Expected the front center cubie");
    }

    const centerTwistedInPlace = cube.map((cubie) =>
      cubie.id === center.id ? { ...cubie, orientation: rotationMatrix("z", 1) } : cubie,
    );

    expect(isSolved(centerTwistedInPlace)).toBe(true);
  });
});
