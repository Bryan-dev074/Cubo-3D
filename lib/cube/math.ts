import { IDENTITY_MATRIX, POSITIVE_QUARTER_TURN } from "@/lib/cube/constants";
import type { Axis, AxisValue, Mat3i, QuarterTurn, Vec3i } from "@/lib/cube/types";

export function multiplyMatrices(left: Mat3i, right: Mat3i): Mat3i {
  return [
    normalizeInteger(left[0] * right[0] + left[1] * right[3] + left[2] * right[6]),
    normalizeInteger(left[0] * right[1] + left[1] * right[4] + left[2] * right[7]),
    normalizeInteger(left[0] * right[2] + left[1] * right[5] + left[2] * right[8]),
    normalizeInteger(left[3] * right[0] + left[4] * right[3] + left[5] * right[6]),
    normalizeInteger(left[3] * right[1] + left[4] * right[4] + left[5] * right[7]),
    normalizeInteger(left[3] * right[2] + left[4] * right[5] + left[5] * right[8]),
    normalizeInteger(left[6] * right[0] + left[7] * right[3] + left[8] * right[6]),
    normalizeInteger(left[6] * right[1] + left[7] * right[4] + left[8] * right[7]),
    normalizeInteger(left[6] * right[2] + left[7] * right[5] + left[8] * right[8]),
  ];
}

export function transformVector(matrix: Mat3i, vector: Vec3i): Vec3i {
  return [
    asAxisValue(matrix[0] * vector[0] + matrix[1] * vector[1] + matrix[2] * vector[2]),
    asAxisValue(matrix[3] * vector[0] + matrix[4] * vector[1] + matrix[5] * vector[2]),
    asAxisValue(matrix[6] * vector[0] + matrix[7] * vector[1] + matrix[8] * vector[2]),
  ];
}

export function rotationMatrix(axis: Axis, turns: QuarterTurn): Mat3i {
  const positive = POSITIVE_QUARTER_TURN[axis];

  if (turns === 1) {
    return positive;
  }

  if (turns === 2) {
    return multiplyMatrices(positive, positive);
  }

  return multiplyMatrices(multiplyMatrices(positive, positive), positive);
}

export function determinant(matrix: Mat3i): number {
  return (
    matrix[0] * (matrix[4] * matrix[8] - matrix[5] * matrix[7]) -
    matrix[1] * (matrix[3] * matrix[8] - matrix[5] * matrix[6]) +
    matrix[2] * (matrix[3] * matrix[7] - matrix[4] * matrix[6])
  );
}

export function isOrthonormalIntegerMatrix(matrix: Mat3i): boolean {
  return (
    matrix.every((value) => Number.isInteger(value) && Math.abs(value) <= 1) &&
    multiplyMatrices(matrix, transpose(matrix)).every(
      (value, index) => value === IDENTITY_MATRIX[index],
    ) &&
    determinant(matrix) === 1
  );
}

function transpose(matrix: Mat3i): Mat3i {
  return [matrix[0], matrix[3], matrix[6], matrix[1], matrix[4], matrix[7], matrix[2], matrix[5], matrix[8]];
}

function asAxisValue(value: number): AxisValue {
  if (value !== -1 && value !== 0 && value !== 1) {
    throw new Error(`Expected an axis value, received ${value}`);
  }

  return value === 0 ? 0 : value;
}

function normalizeInteger(value: number): number {
  return value === 0 ? 0 : value;
}
