import { describe, expect, it } from "vitest";

import {
  MOBILE_CUBE_DROP_PROFILE,
  sampleCubeDrop,
} from "@/lib/motion/cube-drop";

describe("sampleCubeDrop", () => {
  it("starts framed and falls monotonically to contact at .72", () => {
    const start = sampleCubeDrop(0);
    const airborne = Array.from({ length: 185 }, (_, index) =>
      sampleCubeDrop(index / 256),
    );
    const contact = sampleCubeDrop(0.72);

    expect(start.offsetY).toBeCloseTo(0.68, 10);
    expect(start.offsetY).toBeLessThan(1);
    for (let index = 1; index < airborne.length; index += 1) {
      expect(airborne[index]!.offsetY).toBeLessThanOrEqual(
        airborne[index - 1]!.offsetY,
      );
    }
    expect(contact.offsetY).toBeCloseTo(0, 10);
  });

  it("uses one bounded negative settle lobe and ends exactly canonical", () => {
    const postContact = Array.from({ length: 72 }, (_, index) =>
      sampleCubeDrop(0.72 + (index / 71) * 0.28),
    );
    const settle = sampleCubeDrop(0.9);
    const end = sampleCubeDrop(1);

    expect(settle.offsetY).toBeLessThan(0);
    expect(Math.min(...postContact.map((sample) => sample.offsetY))).toBeGreaterThanOrEqual(
      -0.032,
    );
    expect(postContact.slice(1, -1).every((sample) => sample.offsetY < 0)).toBe(
      true,
    );
    expect(end).toEqual({
      offsetY: 0,
      rotationX: 0,
      rotationZ: 0,
      shadowOpacity: 1,
      shadowScale: 1,
    });
  });

  it("never rotates during the complete desktop or mobile arrival", () => {
    for (const profile of [undefined, MOBILE_CUBE_DROP_PROFILE]) {
      const samples = Array.from({ length: 257 }, (_, index) =>
        sampleCubeDrop(index / 256, profile),
      );
      expect(samples.every((sample) => sample.rotationX === 0)).toBe(true);
      expect(samples.every((sample) => sample.rotationZ === 0)).toBe(true);
    }
  });

  it("advances the shadow monotonically to contact", () => {
    const samples = Array.from({ length: 257 }, (_, index) =>
      sampleCubeDrop(index / 256),
    );
    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index]!.shadowOpacity).toBeGreaterThanOrEqual(
        samples[index - 1]!.shadowOpacity,
      );
      expect(samples[index]!.shadowScale).toBeGreaterThanOrEqual(
        samples[index - 1]!.shadowScale,
      );
    }
    expect(sampleCubeDrop(0.72).shadowOpacity).toBe(1);
    expect(sampleCubeDrop(0.72).shadowScale).toBe(1);
  });

  it("clamps invalid progress and never produces a second bounce", () => {
    expect(sampleCubeDrop(-1)).toEqual(sampleCubeDrop(0));
    expect(sampleCubeDrop(2)).toEqual(sampleCubeDrop(1));
    const postContact = [0.72, 0.8, 0.85, 0.9, 0.95, 1].map(
      (progress) => sampleCubeDrop(progress).offsetY,
    );

    expect(postContact.filter((value) => value > 0)).toHaveLength(0);
  });

  it("uses the bounded mobile profile without changing the canonical pose", () => {
    const start = sampleCubeDrop(0, MOBILE_CUBE_DROP_PROFILE);
    const settle = Array.from({ length: 257 }, (_, index) =>
      sampleCubeDrop(index / 256, MOBILE_CUBE_DROP_PROFILE),
    );

    expect(start.offsetY).toBeCloseTo(0.56, 10);
    expect(Math.min(...settle.map((sample) => sample.offsetY))).toBeGreaterThanOrEqual(
      -0.026,
    );
    expect(sampleCubeDrop(1, MOBILE_CUBE_DROP_PROFILE)).toEqual(
      sampleCubeDrop(1),
    );
  });
});
