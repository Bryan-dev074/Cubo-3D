import { describe, expect, it } from "vitest";

import { createStickerDescriptors } from "@/components/cube/Cubie";
import {
  advanceMoveAnimation,
  createMoveAnimationStart,
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

  it("hands the released preview angle and recent velocity into the settle animation", () => {
    const move = { axis: "x", layer: 1, turns: 1 } as const;
    const start = createMoveAnimationStart(move, {
      move,
      angle: 0.31,
      angularVelocity: 2.4,
      selectedIds: new Set<string>(),
    });
    const carried = advanceMoveAnimation(
      start,
      moveTargetAngle(move),
      1 / 60,
      false,
    );
    const uncarried = advanceMoveAnimation(
      { angle: start.angle, angularVelocity: 0 },
      moveTargetAngle(move),
      1 / 60,
      false,
    );

    expect(start).toEqual({ angle: 0.31, angularVelocity: 2.4 });
    expect(carried.angle).toBeGreaterThanOrEqual(start.angle);
    expect(carried.angle).toBeGreaterThan(uncarried.angle);
  });

  it.each([
    ["quarter", { axis: "z", layer: 1, turns: 1 } as const],
    ["half", { axis: "y", layer: -1, turns: 2 } as const],
  ])("settles an ordinary %s turn exactly in under 300ms", (_, move) => {
    const target = moveTargetAngle(move);
    let animation = { angle: 0, angularVelocity: 0, done: false };
    let elapsed = 0;

    while (!animation.done && elapsed < 1) {
      animation = advanceMoveAnimation(animation, target, 1 / 60, false);
      elapsed += 1 / 60;
    }

    expect(animation.done).toBe(true);
    expect(elapsed).toBeLessThan(0.3);
    expect(animation.angle).toBe(target);
  });

  it("snaps a reduced-motion move to its exact target in one step", () => {
    const target = Math.PI / 2;

    expect(
      advanceMoveAnimation(
        { angle: 0.21, angularVelocity: 1.7 },
        target,
        1 / 60,
        true,
      ),
    ).toEqual({
      angle: target,
      angularVelocity: 0,
      done: true,
    });
  });
});
