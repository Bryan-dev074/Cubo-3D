import { describe, expect, it } from "vitest";

import { sampleCubeDrop } from "@/lib/motion/cube-drop";

describe("sampleCubeDrop", () => {
  it("falls from above, settles once, and ends exactly canonical", () => {
    const start = sampleCubeDrop(0);
    const contact = sampleCubeDrop(0.78);
    const settle = sampleCubeDrop(0.9);
    const end = sampleCubeDrop(1);

    expect(start.offsetY).toBeGreaterThan(4);
    expect(Math.abs(start.rotationZ)).toBeGreaterThan(0);
    expect(contact.offsetY).toBeCloseTo(0, 4);
    expect(settle.offsetY).toBeLessThan(0);
    expect(Math.abs(settle.offsetY)).toBeLessThan(0.1);
    expect(end).toEqual({
      offsetY: 0,
      rotationX: 0,
      rotationZ: 0,
      shadowOpacity: 1,
      shadowScale: 1,
    });
  });

  it("clamps invalid progress and never produces a second bounce", () => {
    expect(sampleCubeDrop(-1)).toEqual(sampleCubeDrop(0));
    expect(sampleCubeDrop(2)).toEqual(sampleCubeDrop(1));
    const postContact = [0.8, 0.85, 0.9, 0.95, 1].map(
      (progress) => sampleCubeDrop(progress).offsetY,
    );

    expect(postContact.filter((value) => value > 0)).toHaveLength(0);
  });
});
