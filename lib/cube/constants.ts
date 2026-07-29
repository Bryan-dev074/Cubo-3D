import type { Axis, Mat3i } from "@/lib/cube/types";

export const IDENTITY_MATRIX: Mat3i = [1, 0, 0, 0, 1, 0, 0, 0, 1];

// Positive turns follow the right-hand rule around the positive world axis.
export const POSITIVE_QUARTER_TURN: Readonly<Record<Axis, Mat3i>> = {
  x: [1, 0, 0, 0, 0, -1, 0, 1, 0],
  y: [0, 0, 1, 0, 1, 0, -1, 0, 0],
  z: [0, -1, 0, 1, 0, 0, 0, 0, 1],
};
