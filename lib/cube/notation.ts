import type { Axis, AxisValue, CubeMove, QuarterTurn } from "@/lib/cube/types";

export type LayerId =
  | "right"
  | "left"
  | "up"
  | "down"
  | "front"
  | "back"
  | "middle"
  | "equator"
  | "standing";

export interface LayerNotation {
  readonly id: LayerId;
  readonly axis: Axis;
  readonly layer: AxisValue;
  readonly notation: "R" | "L" | "U" | "D" | "F" | "B" | "M" | "E" | "S";
  readonly clockwiseTurns: Extract<QuarterTurn, -1 | 1>;
}

export const LAYER_NOTATION: readonly LayerNotation[] = Object.freeze([
  freezeLayer({ id: "right", axis: "x", layer: 1, notation: "R", clockwiseTurns: -1 }),
  freezeLayer({ id: "left", axis: "x", layer: -1, notation: "L", clockwiseTurns: 1 }),
  freezeLayer({ id: "up", axis: "y", layer: 1, notation: "U", clockwiseTurns: 1 }),
  freezeLayer({ id: "down", axis: "y", layer: -1, notation: "D", clockwiseTurns: -1 }),
  freezeLayer({ id: "front", axis: "z", layer: 1, notation: "F", clockwiseTurns: -1 }),
  freezeLayer({ id: "back", axis: "z", layer: -1, notation: "B", clockwiseTurns: 1 }),
  freezeLayer({ id: "middle", axis: "x", layer: 0, notation: "M", clockwiseTurns: 1 }),
  freezeLayer({ id: "equator", axis: "y", layer: 0, notation: "E", clockwiseTurns: -1 }),
  freezeLayer({ id: "standing", axis: "z", layer: 0, notation: "S", clockwiseTurns: -1 }),
]);

export function createLayerMove(
  layer: LayerNotation,
  direction: "clockwise" | "counterclockwise",
): CubeMove {
  return Object.freeze({
    axis: layer.axis,
    layer: layer.layer,
    turns: direction === "clockwise" ? layer.clockwiseTurns : invertQuarterTurn(layer.clockwiseTurns),
  });
}

function invertQuarterTurn(turns: Extract<QuarterTurn, -1 | 1>): Extract<QuarterTurn, -1 | 1> {
  return turns === 1 ? -1 : 1;
}

function freezeLayer(layer: LayerNotation): LayerNotation {
  return Object.freeze(layer);
}
