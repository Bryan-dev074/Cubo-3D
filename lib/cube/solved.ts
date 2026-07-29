import { transformVector } from "@/lib/cube/math";
import { assertCubeInvariants } from "@/lib/cube/state";
import type { CubieState, Vec3i } from "@/lib/cube/types";

export function isSolved(cube: readonly CubieState[]): boolean {
  assertCubeInvariants(cube);

  return cube.every(
    (cubie) => sameVector(cubie.position, cubie.home) && hasSolvedStickerNormals(cubie),
  );
}

function hasSolvedStickerNormals(cubie: CubieState): boolean {
  return stickerNormals(cubie.home).every((normal) =>
    sameVector(transformVector(cubie.orientation, normal), normal),
  );
}

function stickerNormals(home: Vec3i): readonly Vec3i[] {
  return home.flatMap((value, index) => {
    if (value === 0) {
      return [];
    }

    const normal: [number, number, number] = [0, 0, 0];
    normal[index] = value;
    return [normal as Vec3i];
  });
}

function sameVector(left: Vec3i, right: Vec3i): boolean {
  return left[0] === right[0] && left[1] === right[1] && left[2] === right[2];
}
