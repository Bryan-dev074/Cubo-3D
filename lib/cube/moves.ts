import { multiplyMatrices, rotationMatrix, transformVector } from "@/lib/cube/math";
import { assertCubeInvariants, freezeCubie, freezeMatrix, freezeVector } from "@/lib/cube/state";
import type { CubeMove, CubieState } from "@/lib/cube/types";

export function applyMove(cube: readonly CubieState[], move: CubeMove): readonly CubieState[] {
  assertCubeInvariants(cube);
  const rotation = rotationMatrix(move.axis, move.turns);
  const axisIndex = move.axis === "x" ? 0 : move.axis === "y" ? 1 : 2;

  const next = cube.map((cubie) => {
    if (cubie.position[axisIndex] !== move.layer) {
      return cubie;
    }

    return freezeCubie({
      ...cubie,
      position: freezeVector(transformVector(rotation, cubie.position)),
      orientation: freezeMatrix(multiplyMatrices(rotation, cubie.orientation)),
    });
  });

  assertCubeInvariants(next);
  return Object.freeze(next);
}

export function inverseMove(move: CubeMove): CubeMove {
  return {
    ...move,
    turns: move.turns === 2 ? 2 : move.turns === 1 ? -1 : 1,
  };
}
