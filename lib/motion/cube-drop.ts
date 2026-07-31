export interface CubeDropSample {
  readonly offsetY: number;
  readonly rotationX: number;
  readonly rotationZ: number;
  readonly shadowOpacity: number;
  readonly shadowScale: number;
}

const INITIAL_TILT = (5 * Math.PI) / 180;

function smoothstep(edge0: number, edge1: number, value: number): number {
  const progress = Math.min(
    1,
    Math.max(0, (value - edge0) / (edge1 - edge0)),
  );
  return progress * progress * (3 - 2 * progress);
}

export function sampleCubeDrop(progress: number): CubeDropSample {
  const p = Math.min(1, Math.max(0, progress));
  const contactProgress = Math.min(1, p / 0.78);
  const fall = 1 - contactProgress * contactProgress;
  const settleProgress = Math.min(1, Math.max(0, (p - 0.78) / 0.22));
  const settlement =
    p < 0.78
      ? 0
      : -0.065 *
        Math.sin(settleProgress * Math.PI) *
        (1 - settleProgress * 0.2);
  const orientation = 1 - smoothstep(0.12, 0.86, p);
  const contactCue = smoothstep(0.28, 0.82, p);

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
    offsetY: 4.8 * fall + settlement,
    rotationX: -INITIAL_TILT * 0.45 * orientation,
    rotationZ: INITIAL_TILT * orientation,
    shadowOpacity: 0.12 + contactCue * 0.88,
    shadowScale: 0.74 + contactCue * 0.26,
  };
}
