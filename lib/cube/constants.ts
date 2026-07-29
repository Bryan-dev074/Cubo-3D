import type { Axis, Mat3i } from "@/lib/cube/types";

export const IDENTITY_MATRIX = freezeMatrix([1, 0, 0, 0, 1, 0, 0, 0, 1]);

// Positive turns follow the right-hand rule around the positive world axis.
export const POSITIVE_QUARTER_TURN: Readonly<Record<Axis, Mat3i>> = Object.freeze({
  x: freezeMatrix([1, 0, 0, 0, 0, -1, 0, 1, 0]),
  y: freezeMatrix([0, 0, 1, 0, 1, 0, -1, 0, 0]),
  z: freezeMatrix([0, -1, 0, 1, 0, 0, 0, 0, 1]),
});

function freezeMatrix(matrix: Mat3i): Mat3i {
  return Object.freeze(matrix) as Mat3i;
}
