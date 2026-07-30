import { readFileSync } from "node:fs";
import path, { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("production rendering contracts", () => {
  it("keeps the cube static when the user is idle", () => {
    const magicCubeSource = readFileSync(
      path.join(process.cwd(), "components/cube/MagicCube.tsx"),
      "utf8",
    );
    const sceneSource = readFileSync(
      path.join(process.cwd(), "components/cube/CubeScene.tsx"),
      "utf8",
    );

    expect(magicCubeSource).not.toContain("setInterval");
    expect(magicCubeSource).not.toContain("ambientTurnEnabled");
    expect(sceneSource).toContain('frameloop="demand"');
    expect(sceneSource).toContain("autoRotate={false}");
  });

  it("renders the expensive contact shadow once instead of on every idle invalidation", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/cube/CubeScene.tsx"),
      "utf8",
    );

    expect(source).toMatch(
      /<ContactShadows[\s\S]*?frames=\{1\}[\s\S]*?\/>/,
    );
    expect(source).not.toContain("frames={Infinity}");
    expect(source).not.toContain("shadowSize: 2048");
    expect(source).not.toContain("dprCap: 2");
  });

  it("runs the performance lab with the normal motion preference", () => {
    const source = readFileSync(
      resolve(process.cwd(), "tests/e2e/performance.spec.ts"),
      "utf8",
    );

    expect(source).toContain('reducedMotion: "no-preference"');
    expect(source).toContain('trace: "off"');
    expect(source).toContain("await mkdir(durableMetricsDirectory");
    expect(source).toContain("recursive: true");
  });

  it("creates the ignored visual artifact directory on a clean clone", () => {
    const source = readFileSync(
      resolve(process.cwd(), "tests/e2e/responsive.spec.ts"),
      "utf8",
    );

    expect(source).toContain("await mkdir(VISUAL_ARTIFACT_DIRECTORY");
    expect(source).toContain("recursive: true");
  });

  it("keeps generated worktrees and local evidence outside the lint surface", () => {
    const source = readFileSync(
      resolve(process.cwd(), "eslint.config.mjs"),
      "utf8",
    );

    expect(source).toContain('".worktrees/**"');
    expect(source).toContain('".superpowers/**"');
  });

  it("scopes deterministic randomness to the scramble click instead of the page lifetime", () => {
    const source = readFileSync(
      resolve(process.cwd(), "tests/e2e/helpers.ts"),
      "utf8",
    );
    const browserStateSource = source.match(
      /export async function setDeterministicBrowserState[\s\S]*?(?=export async function openExperience)/,
    )?.[0];

    expect(browserStateSource).toBeDefined();
    expect(browserStateSource).not.toContain("Math.random");
    expect(source).toContain('window.addEventListener("click", restore');
    expect(source).toContain("setTimeout(restore, 0)");
  });
});
