import {
  sampleCubeDrop,
  type CubeDropProfile,
} from "@/lib/motion/cube-drop";

export const CUBE_DROP_CAMERA_FOV = 34;
export const CUBE_DROP_HALF_EXTENT = 1.51;
export const CUBE_DROP_SAFE_MARGIN_NDC = 0.028;
export const CUBE_DROP_BINARY_SEARCH_ITERATIONS = 18;
export const CUBE_DROP_FRAMING_SAMPLES = 65;

export interface CubeDropFramingInput {
  readonly aspect: number;
  readonly cameraPosition: readonly [number, number, number];
  readonly cameraTarget: readonly [number, number, number];
  readonly cubePosition: readonly [number, number, number];
  readonly cubeScale: number;
  readonly desiredProfile: CubeDropProfile;
}

export interface CubeDropNdcPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

type Vec3 = readonly [number, number, number];

export function projectCubeDropCorners(
  input: CubeDropFramingInput,
  profile: CubeDropProfile,
  progress: number,
): readonly CubeDropNdcPoint[] {
  const sample = sampleCubeDrop(progress, profile);
  const forward = normalize(subtract(input.cameraTarget, input.cameraPosition));
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = normalize(cross(right, forward));
  const tangent = Math.tan((CUBE_DROP_CAMERA_FOV * Math.PI) / 360);
  const aspect = Math.max(Number.EPSILON, input.aspect);
  const halfExtent = CUBE_DROP_HALF_EXTENT * input.cubeScale;
  const cosX = Math.cos(sample.rotationX);
  const sinX = Math.sin(sample.rotationX);
  const cosZ = Math.cos(sample.rotationZ);
  const sinZ = Math.sin(sample.rotationZ);
  const corners: CubeDropNdcPoint[] = [];

  for (const xSign of [-1, 1] as const) {
    for (const ySign of [-1, 1] as const) {
      for (const zSign of [-1, 1] as const) {
        const localX = xSign * halfExtent;
        const localY = ySign * halfExtent;
        const localZ = zSign * halfExtent;
        const rotatedX = localX;
        const rotatedY = localY * cosX - localZ * sinX;
        const rotatedZ = localY * sinX + localZ * cosX;
        const finalX = rotatedX * cosZ - rotatedY * sinZ;
        const finalY = rotatedX * sinZ + rotatedY * cosZ;
        const world: Vec3 = [
          input.cubePosition[0] + finalX,
          input.cubePosition[1] + sample.offsetY + finalY,
          input.cubePosition[2] + rotatedZ,
        ];
        const relative = subtract(world, input.cameraPosition);
        const depth = dot(relative, forward);

        corners.push({
          x: dot(relative, right) / (depth * tangent * aspect),
          y: dot(relative, up) / (depth * tangent),
          z: depth,
        });
      }
    }
  }

  return corners;
}

export function resolveFramedCubeDropProfile({
  ...input
}: CubeDropFramingInput): CubeDropProfile {
  const desiredProfile = input.desiredProfile;
  const fits = (motionScale: number) => {
    const profile = { ...desiredProfile, motionScale };
    const limit = 1 - CUBE_DROP_SAFE_MARGIN_NDC;

    for (let index = 0; index < CUBE_DROP_FRAMING_SAMPLES; index += 1) {
      const progress = index / (CUBE_DROP_FRAMING_SAMPLES - 1);
      const corners = projectCubeDropCorners(input, profile, progress);
      if (
        corners.some(
          (corner) =>
            corner.z <= 0 ||
            Math.abs(corner.x) > limit ||
            Math.abs(corner.y) > limit,
        )
      ) {
        return false;
      }
    }
    return true;
  };

  if (fits(1)) {
    return { ...desiredProfile, motionScale: 1 };
  }

  let lower = 0;
  let upper = 1;
  for (
    let iteration = 0;
    iteration < CUBE_DROP_BINARY_SEARCH_ITERATIONS;
    iteration += 1
  ) {
    const candidate = (lower + upper) / 2;
    if (fits(candidate)) {
      lower = candidate;
    } else {
      upper = candidate;
    }
  }

  return { ...desiredProfile, motionScale: lower };
}

function subtract(left: Vec3, right: Vec3): Vec3 {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function dot(left: Vec3, right: Vec3): number {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function cross(left: Vec3, right: Vec3): Vec3 {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

function normalize(vector: Vec3): Vec3 {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (length === 0) {
    return [0, 0, 0];
  }
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}
