export interface CubeDropSample {
  readonly offsetY: number;
  readonly rotationX: number;
  readonly rotationZ: number;
  readonly shadowOpacity: number;
  readonly shadowScale: number;
}

export interface CubeDropProfile {
  readonly contactAt: number;
  readonly initialTiltRadians: number;
  readonly motionScale: number;
  readonly settleDepth: number;
  readonly startOffsetY: number;
}

export const DESKTOP_CUBE_DROP_PROFILE: CubeDropProfile = Object.freeze({
  contactAt: 0.72,
  initialTiltRadians: (4 * Math.PI) / 180,
  motionScale: 1,
  settleDepth: 0.032,
  startOffsetY: 0.68,
});

export const MOBILE_CUBE_DROP_PROFILE: CubeDropProfile = Object.freeze({
  contactAt: 0.72,
  initialTiltRadians: (3 * Math.PI) / 180,
  motionScale: 1,
  settleDepth: 0.026,
  startOffsetY: 0.62,
});

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const progress = Math.min(
    1,
    Math.max(0, (value - edge0) / (edge1 - edge0)),
  );
  return progress * progress * (3 - 2 * progress);
}

export function sampleCubeDrop(
  progress: number,
  profile: CubeDropProfile = DESKTOP_CUBE_DROP_PROFILE,
): CubeDropSample {
  const p = clamp01(progress);
  const motionScale = clamp01(profile.motionScale);
  const fallT = clamp01(p / profile.contactAt);
  const fall = profile.startOffsetY * (1 - fallT * fallT);
  const settleT = clamp01(
    (p - profile.contactAt) / (1 - profile.contactAt),
  );
  const settle =
    p < profile.contactAt
      ? 0
      : -profile.settleDepth *
        Math.sin(settleT * Math.PI) *
        (1 - settleT * 0.18);
  const orientation = 1 - smoothstep(0.08, 0.68, p);
  const contactCue = smoothstep(0.12, profile.contactAt, p);

  if (p === 1) {
    return {
      offsetY: 0,
      rotationX: 0,
      rotationZ: 0,
      shadowOpacity: 1,
      shadowScale: 1,
    };
  }

  return {
    offsetY: (fall + settle) * motionScale,
    rotationX:
      -profile.initialTiltRadians * 0.45 * orientation * motionScale,
    rotationZ: profile.initialTiltRadians * orientation * motionScale,
    shadowOpacity: 0.12 + contactCue * 0.88,
    shadowScale: 0.74 + contactCue * 0.26,
  };
}
