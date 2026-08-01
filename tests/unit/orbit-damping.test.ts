import { describe, expect, it } from "vitest";

import {
  ORBIT_DAMPING_FACTOR_AT_60_FPS,
  resolveOrbitDampingFactor,
} from "@/lib/motion/orbit-damping";

describe("resolveOrbitDampingFactor", () => {
  it("preserves the approved damping feel at 60 fps", () => {
    expect(resolveOrbitDampingFactor(1 / 60)).toBeCloseTo(
      ORBIT_DAMPING_FACTOR_AT_60_FPS,
      12,
    );
  });

  it("keeps the same decay over equal wall time at different frame rates", () => {
    const halfFrame = resolveOrbitDampingFactor(1 / 120);
    const twoHalfFrameDecay = 1 - (1 - halfFrame) ** 2;

    expect(twoHalfFrameDecay).toBeCloseTo(
      resolveOrbitDampingFactor(1 / 60),
      12,
    );
  });

  it("catches up after a late frame without exceeding a valid factor", () => {
    const lateFrame = resolveOrbitDampingFactor(0.375);

    expect(lateFrame).toBeGreaterThan(0.8);
    expect(lateFrame).toBeLessThanOrEqual(1);
  });

  it("falls back to one nominal frame for invalid deltas", () => {
    expect(resolveOrbitDampingFactor(0)).toBe(
      ORBIT_DAMPING_FACTOR_AT_60_FPS,
    );
    expect(resolveOrbitDampingFactor(Number.NaN)).toBe(
      ORBIT_DAMPING_FACTOR_AT_60_FPS,
    );
  });
});
