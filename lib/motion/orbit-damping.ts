export const ORBIT_DAMPING_FACTOR_AT_60_FPS = 0.075;

const REFERENCE_FRAME_RATE = 60;

export function resolveOrbitDampingFactor(
  deltaSeconds: number,
  baseFactor = ORBIT_DAMPING_FACTOR_AT_60_FPS,
): number {
  const safeBaseFactor = Math.min(1, Math.max(0, baseFactor));
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
    return safeBaseFactor;
  }
  const frameScale = deltaSeconds * REFERENCE_FRAME_RATE;

  return Math.min(
    1,
    Math.max(0, 1 - (1 - safeBaseFactor) ** frameScale),
  );
}
