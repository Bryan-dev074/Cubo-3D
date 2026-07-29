import { describe, expect, it } from "vitest";

import { resolveLayerGesture } from "@/lib/cube/gesture";
import type { GestureProjectionInput } from "@/lib/cube/gesture";
import type { Axis, AxisValue } from "@/lib/cube/types";

const CANDIDATES = [
  { axis: "x", layer: -1, tangent: [1, 0] },
  { axis: "y", layer: 0, tangent: [0, 1] },
  { axis: "z", layer: 1, tangent: [-1, 1] },
] as const satisfies GestureProjectionInput["candidates"];

describe("resolveLayerGesture", () => {
  it.each([
    {
      label: "positive x tangent on the negative layer",
      drag: [12, 1] as const,
      axis: "x" as Axis,
      layer: -1 as AxisValue,
      turns: 1,
    },
    {
      label: "negative x tangent on the negative layer",
      drag: [-12, -1] as const,
      axis: "x" as Axis,
      layer: -1 as AxisValue,
      turns: -1,
    },
    {
      label: "positive y tangent on the central layer",
      drag: [1, 12] as const,
      axis: "y" as Axis,
      layer: 0 as AxisValue,
      turns: 1,
    },
    {
      label: "negative y tangent on the central layer",
      drag: [-1, -12] as const,
      axis: "y" as Axis,
      layer: 0 as AxisValue,
      turns: -1,
    },
    {
      label: "positive diagonal tangent on the positive layer",
      drag: [-10, 10] as const,
      axis: "z" as Axis,
      layer: 1 as AxisValue,
      turns: 1,
    },
    {
      label: "negative diagonal tangent on the positive layer",
      drag: [10, -10] as const,
      axis: "z" as Axis,
      layer: 1 as AxisValue,
      turns: -1,
    },
  ])("selects the $label", ({ drag, axis, layer, turns }) => {
    expect(resolveLayerGesture({ drag, candidates: CANDIDATES })).toEqual({
      axis,
      layer,
      turns,
    });
  });

  it("compares normalized tangents rather than their projected magnitude", () => {
    expect(
      resolveLayerGesture({
        drag: [9, 10],
        candidates: [
          { axis: "x", layer: 1, tangent: [100, 0] },
          { axis: "y", layer: -1, tangent: [0, 1] },
        ],
      }),
    ).toEqual({ axis: "y", layer: -1, turns: 1 });
  });

  it("returns null below the 8 px dead zone", () => {
    expect(resolveLayerGesture({ drag: [4, 6], candidates: CANDIDATES })).toBeNull();
  });

  it("resolves a drag exactly at the 8 px threshold", () => {
    expect(resolveLayerGesture({ drag: [8, 0], candidates: CANDIDATES })).toEqual({
      axis: "x",
      layer: -1,
      turns: 1,
    });
  });

  it("returns null when no projected candidate can establish a direction", () => {
    expect(
      resolveLayerGesture({
        drag: [10, 0],
        candidates: [{ axis: "x", layer: 1, tangent: [0, 0] }],
      }),
    ).toBeNull();
  });
});
