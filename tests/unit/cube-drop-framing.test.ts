import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { resolveCubePresentation } from "@/components/cube/cube-presentation";
import {
  CUBE_DROP_SAFE_MARGIN_NDC,
  projectCubeDropCorners,
  resolveFramedCubeDropProfile,
  type CubeDropFramingInput,
} from "@/lib/motion/cube-drop-framing";

describe("cube drop runtime framing", () => {
  it("provides the pure projection helper and its fixed safety constants", () => {
    const helperPath = resolve(
      process.cwd(),
      "lib/motion/cube-drop-framing.ts",
    );

    expect(existsSync(helperPath)).toBe(true);
    const source = readFileSync(helperPath, "utf8");
    expect(source).toContain("34");
    expect(source).toContain("1.51");
    expect(source).toContain("0.028");
    expect(source).toContain("18");
    expect(source).toContain("65");
  });

  it.each([
    {
      canvasHeight: 701,
      canvasWidth: 614,
      name: "desktop 1440",
      viewportWidth: 1440,
    },
    {
      canvasHeight: 405,
      canvasWidth: 390,
      name: "mobile 390",
      viewportWidth: 390,
    },
    {
      canvasHeight: 336,
      canvasWidth: 320,
      name: "mobile 320",
      viewportWidth: 320,
    },
    {
      canvasHeight: 304,
      canvasWidth: 844,
      name: "landscape 844x390",
      viewportWidth: 844,
    },
  ])(
    "keeps all eight corners inside the safe NDC area at $name",
    ({ canvasHeight, canvasWidth, viewportWidth }) => {
      const presentation = resolveCubePresentation(viewportWidth, "neutral");
      const input: CubeDropFramingInput = {
        aspect: canvasWidth / canvasHeight,
        cameraPosition: presentation.cameraPosition,
        cameraTarget: presentation.cameraTarget,
        cubePosition: presentation.cubePosition,
        cubeScale: presentation.cubeScale,
        desiredProfile: presentation.dropProfile,
      };
      const profile = resolveFramedCubeDropProfile(input);
      const limit = 1 - CUBE_DROP_SAFE_MARGIN_NDC;

      expect(profile.motionScale).toBeGreaterThanOrEqual(0.9);
      expect(profile.motionScale).toBeLessThanOrEqual(1);
      for (let index = 0; index <= 256; index += 1) {
        const corners = projectCubeDropCorners(input, profile, index / 256);
        expect(corners).toHaveLength(8);
        for (const corner of corners) {
          expect(corner.z).toBeGreaterThan(0);
          expect(Math.abs(corner.x)).toBeLessThanOrEqual(limit + 1e-10);
          expect(Math.abs(corner.y)).toBeLessThanOrEqual(limit + 1e-10);
        }
      }
    },
  );

  it.each([
    {
      canvasHeight: 701,
      canvasWidth: 614,
      maximumCanvasFraction: 0.12,
      minimumSafetyMargin: 0,
      name: "desktop",
      viewportWidth: 1440,
    },
    {
      canvasHeight: 405,
      canvasWidth: 390,
      maximumCanvasFraction: 0.09,
      minimumSafetyMargin: 0.004,
      name: "mobile",
      viewportWidth: 390,
    },
  ])(
    "keeps the $name progress-zero projected offset inside its framing budget",
    ({
      canvasHeight,
      canvasWidth,
      maximumCanvasFraction,
      minimumSafetyMargin,
      viewportWidth,
    }) => {
      const presentation = resolveCubePresentation(viewportWidth, "neutral");
      const input: CubeDropFramingInput = {
        aspect: canvasWidth / canvasHeight,
        cameraPosition: presentation.cameraPosition,
        cameraTarget: presentation.cameraTarget,
        cubePosition: presentation.cubePosition,
        cubeScale: presentation.cubeScale,
        desiredProfile: presentation.dropProfile,
      };
      const profile = resolveFramedCubeDropProfile(input);
      const projectedCenterY = (progress: number) => {
        const ys = projectCubeDropCorners(input, profile, progress).map(
          (corner) => corner.y,
        );
        return (Math.min(...ys) + Math.max(...ys)) / 2;
      };
      const projectedCanvasFraction =
        Math.abs(projectedCenterY(0) - projectedCenterY(1)) / 2;

      expect(projectedCanvasFraction).toBeLessThanOrEqual(
        maximumCanvasFraction,
      );
      expect(
        maximumCanvasFraction - projectedCanvasFraction,
      ).toBeGreaterThanOrEqual(minimumSafetyMargin);
    },
  );
});
