import { IDENTITY_MATRIX } from "@/lib/cube/constants";
import { isOrthonormalIntegerMatrix } from "@/lib/cube/math";
import type { AxisValue, CubieState, Mat3i, Vec3i } from "@/lib/cube/types";

const AXIS_VALUES: readonly AxisValue[] = [-1, 0, 1];

export function createSolvedCube(): readonly CubieState[] {
  const cubies = AXIS_VALUES.flatMap((x) =>
    AXIS_VALUES.flatMap((y) =>
      AXIS_VALUES.flatMap((z) => {
        if (x === 0 && y === 0 && z === 0) {
          return [];
        }

        const home = freezeVector([x, y, z]);
        return [
          Object.freeze({
            id: home.join(","),
            home,
            position: home,
            orientation: freezeMatrix(IDENTITY_MATRIX),
          }),
        ];
      }),
    ),
  );

  assertCubeInvariants(cubies);
  return Object.freeze(cubies);
}

export function assertCubeInvariants(cube: readonly CubieState[]): void {
  if (cube.length !== 26) {
    throw new Error(`A cube must contain 26 cubies; received ${cube.length}`);
  }

  const ids = new Set<string>();
  const positions = new Set<string>();

  for (const cubie of cube) {
    if (!ids.add(cubie.id)) {
      throw new Error(`Duplicate cubie id: ${cubie.id}`);
    }

    if (!isValidPosition(cubie.home) || !isValidPosition(cubie.position)) {
      throw new Error(`Cubie ${cubie.id} has an invalid position`);
    }

    const positionKey = cubie.position.join(",");
    if (!positions.add(positionKey)) {
      throw new Error(`Duplicate cubie position: ${positionKey}`);
    }

    if (!isOrthonormalIntegerMatrix(cubie.orientation)) {
      throw new Error(`Cubie ${cubie.id} has an invalid orientation`);
    }
  }
}

export function freezeVector(vector: Vec3i): Vec3i {
  return Object.freeze([...vector]) as Vec3i;
}

export function freezeMatrix(matrix: Mat3i): Mat3i {
  return Object.freeze([...matrix]) as Mat3i;
}

export function freezeCubie(cubie: CubieState): CubieState {
  return Object.freeze(cubie);
}

function isValidPosition(position: Vec3i): boolean {
  return (
    position.some((value) => value !== 0) &&
    position.every((value) => value === -1 || value === 0 || value === 1)
  );
}
