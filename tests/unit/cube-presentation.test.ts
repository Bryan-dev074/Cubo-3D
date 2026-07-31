import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { resolveCubePresentation } from "@/components/cube/cube-presentation";

describe("cube presentation", () => {
  it("resolves distinct complete presentation profiles for desktop and mobile", () => {
    const desktop = resolveCubePresentation(1600, "neutral");
    const mobile = resolveCubePresentation(390, "neutral");

    expect(desktop.isMobile).toBe(false);
    expect(mobile.isMobile).toBe(true);
    expect(desktop.cameraPosition).not.toEqual(mobile.cameraPosition);
    expect(desktop.cameraTarget).not.toEqual(mobile.cameraTarget);
    expect(desktop.cubePosition).not.toEqual(mobile.cubePosition);
    expect(desktop.cubeScale).not.toBe(mobile.cubeScale);
    expect(JSON.stringify(desktop)).toContain('"startOffsetY":0.68');
    expect(JSON.stringify(mobile)).toContain('"startOffsetY":0.62');
    expect(JSON.stringify(desktop)).toContain('"contactAt":0.72');
    expect(resolveCubePresentation(720, "neutral")).toEqual(desktop);
    expect(resolveCubePresentation(719, "neutral")).toEqual(mobile);
    expect(
      resolveCubePresentation(1600, "opposite").cameraPosition,
    ).not.toEqual(desktop.cameraPosition);
  });

  it("feeds the resolved profile into the canvas and physical cube", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/cube/CubeScene.tsx"),
      "utf8",
    );

    expect(source).toMatch(
      /resolveCubePresentation\(\s*budget\.viewportWidth,\s*reviewMode,\s*\)/,
    );
    expect(source).toContain("position: presentation.cameraPosition");
    expect(source).toContain("presentation={presentation}");
    expect(source).toContain("resolveFramedCubeDropProfile");
    expect(source).toContain("dropProfile={dropProfile}");
  });
});
