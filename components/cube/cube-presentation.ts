import {
  DESKTOP_CUBE_DROP_PROFILE,
  MOBILE_CUBE_DROP_PROFILE,
  type CubeDropProfile,
} from "@/lib/motion/cube-drop";

export type CubeReviewMode = "grazing" | "neutral" | "opposite";

export interface CubePresentation {
  readonly cameraPosition: readonly [number, number, number];
  readonly cameraTarget: readonly [number, number, number];
  readonly cubePosition: readonly [number, number, number];
  readonly cubeScale: number;
  readonly dropProfile: CubeDropProfile;
  readonly isMobile: boolean;
}

const DESKTOP_CAMERA_POSITIONS: Readonly<
  Record<CubeReviewMode, readonly [number, number, number]>
> = Object.freeze({
  neutral: [6.45, 5.15, 6.85],
  grazing: [7.5, 2.05, 7.7],
  opposite: [-6.7, 4.55, -7],
});

const MOBILE_CAMERA_POSITIONS: Readonly<
  Record<CubeReviewMode, readonly [number, number, number]>
> = Object.freeze({
  neutral: [5.7, 4.55, 6.05],
  grazing: [6.85, 1.88, 7],
  opposite: [-6.15, 4.2, -6.4],
});

const DESKTOP_CUBE_POSITION = [0.36, 0.45, 0] as const;
const DESKTOP_CAMERA_TARGET = [0.08, -0.04, 0] as const;
const MOBILE_CUBE_POSITION = [0, -0.04, 0] as const;
const MOBILE_CAMERA_TARGET = [0, -0.04, 0] as const;

export function resolveCubePresentation(
  viewportWidth: number,
  reviewMode: CubeReviewMode,
): CubePresentation {
  const isMobile = viewportWidth < 720;

  return isMobile
    ? {
        cameraPosition: MOBILE_CAMERA_POSITIONS[reviewMode],
        cameraTarget: MOBILE_CAMERA_TARGET,
        cubePosition: MOBILE_CUBE_POSITION,
        cubeScale: 0.99,
        dropProfile: MOBILE_CUBE_DROP_PROFILE,
        isMobile: true,
      }
    : {
        cameraPosition: DESKTOP_CAMERA_POSITIONS[reviewMode],
        cameraTarget: DESKTOP_CAMERA_TARGET,
        cubePosition: DESKTOP_CUBE_POSITION,
        cubeScale: 0.94,
        dropProfile: DESKTOP_CUBE_DROP_PROFILE,
        isMobile: false,
      };
}
