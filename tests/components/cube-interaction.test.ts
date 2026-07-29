import { describe, expect, it } from "vitest";

import { createStickerDescriptors } from "@/components/cube/Cubie";
import {
  moveTargetAngle,
  selectLayerCubieIds,
} from "@/components/cube/useMoveQueue";
import { shouldCommitLayerGesture } from "@/components/cube/useLayerGesture";
import { createSolvedCube } from "@/lib/cube/state";

describe("procedural cube scene contracts", () => {
  it("derives exactly 54 stable home-space sticker meshes from the 26 cubies", () => {
    const cube = createSolvedCube();
    const stickers = cube.flatMap(createStickerDescriptors);

    expect(stickers).toHaveLength(54);
    expect(new Set(stickers.map((sticker) => sticker.name)).size).toBe(54);
    expect(stickers.filter((sticker) => sticker.normal[0] !== 0)).toHaveLength(18);
    expect(stickers.filter((sticker) => sticker.normal[1] !== 0)).toHaveLength(18);
    expect(stickers.filter((sticker) => sticker.normal[2] !== 0)).toHaveLength(18);
  });

  it("selects nine outer cubies and eight central cubies from current logical positions", () => {
    const cube = createSolvedCube();

    expect(selectLayerCubieIds(cube, { axis: "x", layer: 1, turns: 1 })).toHaveLength(9);
    expect(selectLayerCubieIds(cube, { axis: "y", layer: 0, turns: -1 })).toHaveLength(8);
  });

  it("maps exact logical turns to snapped visual radians", () => {
    expect(moveTargetAngle({ axis: "x", layer: 1, turns: 1 })).toBeCloseTo(Math.PI / 2);
    expect(moveTargetAngle({ axis: "z", layer: -1, turns: -1 })).toBeCloseTo(-Math.PI / 2);
    expect(moveTargetAngle({ axis: "y", layer: 0, turns: 2 })).toBeCloseTo(Math.PI);
  });

  it("commits a drag from either deliberate distance or decisive velocity", () => {
    expect(shouldCommitLayerGesture(38, 50)).toBe(true);
    expect(shouldCommitLayerGesture(12, 520)).toBe(true);
    expect(shouldCommitLayerGesture(12, 120)).toBe(false);
  });
});
