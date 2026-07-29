import type { Axis, AxisValue, CubeMove } from "@/lib/cube/types";

export type ScreenVector = readonly [x: number, y: number];

export interface GestureProjectionCandidate {
  readonly axis: Axis;
  readonly layer: AxisValue;
  readonly tangent: ScreenVector;
}

export interface GestureProjectionInput {
  readonly drag: ScreenVector;
  readonly candidates: readonly GestureProjectionCandidate[];
}

const DRAG_DEAD_ZONE_PX = 8;

export function resolveLayerGesture(input: GestureProjectionInput): CubeMove | null {
  if (Math.hypot(...input.drag) < DRAG_DEAD_ZONE_PX) {
    return null;
  }

  let selected: GestureProjectionCandidate | null = null;
  let selectedAlignment = 0;

  for (const candidate of input.candidates) {
    const tangentLength = Math.hypot(...candidate.tangent);
    if (tangentLength === 0) {
      continue;
    }

    const alignment =
      (input.drag[0] * candidate.tangent[0] + input.drag[1] * candidate.tangent[1]) /
      tangentLength;

    if (Math.abs(alignment) > Math.abs(selectedAlignment)) {
      selected = candidate;
      selectedAlignment = alignment;
    }
  }

  if (!selected || selectedAlignment === 0) {
    return null;
  }

  return Object.freeze({
    axis: selected.axis,
    layer: selected.layer,
    turns: selectedAlignment > 0 ? 1 : -1,
  });
}
