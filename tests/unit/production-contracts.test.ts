import { readFileSync } from "node:fs";
import path, { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("production rendering contracts", () => {
  it("keeps the WebGL studio light-only and associates its drag instructions", () => {
    const sceneSource = readFileSync(
      resolve(process.cwd(), "components/cube/CubeScene.tsx"),
      "utf8",
    );
    const heroSource = readFileSync(
      resolve(process.cwd(), "components/experience/HeroCopy.tsx"),
      "utf8",
    );

    expect(sceneSource).toContain("palette={LIGHT_PALETTE}");
    expect(sceneSource).not.toContain("DARK_PALETTE");
    expect(sceneSource).not.toContain("prefers-color-scheme: dark");
    expect(sceneSource).toContain('aria-describedby="cube-drag-hint"');
    expect(heroSource).toContain('id="cube-drag-hint"');
  });

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

  it("uses broad studio emitters and a concentrated one-frame contact shadow", () => {
    const sceneSource = readFileSync(
      resolve(process.cwd(), "components/cube/CubeScene.tsx"),
      "utf8",
    );
    const contactShadow = sceneSource.match(
      /<ContactShadows[\s\S]*?\/>/,
    )?.[0];
    const opacity = Number(
      contactShadow?.match(/opacity=\{([\d.]+)\}/)?.[1],
    );
    const scale = Number(contactShadow?.match(/scale=\{([\d.]+)\}/)?.[1]);
    const blur = Number(contactShadow?.match(/blur=\{([\d.]+)\}/)?.[1]);

    expect(sceneSource).toContain("<rectAreaLight");
    expect(sceneSource).not.toContain("<spotLight");
    expect(contactShadow).toBeDefined();
    expect(contactShadow).toContain("frames={1}");
    expect(opacity).toBeGreaterThanOrEqual(0.3);
    expect(opacity).toBeLessThanOrEqual(0.5);
    expect(scale).toBeGreaterThanOrEqual(4);
    expect(scale).toBeLessThanOrEqual(5);
    expect(blur).toBeGreaterThanOrEqual(1);
    expect(blur).toBeLessThan(2);
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
