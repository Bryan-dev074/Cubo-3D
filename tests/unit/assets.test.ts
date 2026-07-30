import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("production cube artwork", () => {
  it("uses a three-quarter vector poster with three real cube faces", () => {
    const poster = readFileSync(
      resolve(process.cwd(), "public/cube-poster.svg"),
      "utf8",
    );

    expect(poster).toContain('data-face="top"');
    expect(poster).toContain('data-face="front"');
    expect(poster).toContain('data-face="right"');
    expect(poster).toContain('data-surface="unfolded-plan"');
    expect(poster).not.toContain("<linearGradient");
  });

  it("ships a local product favicon without third-party branding", () => {
    const iconPath = resolve(process.cwd(), "app/icon.svg");

    expect(existsSync(iconPath)).toBe(true);
    const icon = readFileSync(iconPath, "utf8");
    expect(icon).toContain("<svg");
    expect(icon).toContain("aria-hidden");
    expect(icon.toLowerCase()).not.toContain("rubik");
  });

  it("generates a local Open Graph product image and complete metadata", () => {
    const ogPath = resolve(process.cwd(), "app/opengraph-image.tsx");
    const layoutPath = resolve(process.cwd(), "app/layout.tsx");

    expect(existsSync(ogPath)).toBe(true);
    const ogSource = readFileSync(ogPath, "utf8");
    expect(ogSource).toContain('from "next/og"');
    expect(ogSource).toContain("new ImageResponse");
    expect(ogSource).toContain("Cubo Mágico 3D");
    expect(ogSource.toLowerCase()).not.toContain("rubik");

    const layoutSource = readFileSync(layoutPath, "utf8");
    expect(layoutSource).toContain("metadataBase: resolveSiteOrigin()");
    expect(layoutSource).toContain("alternates:");
    expect(layoutSource).toContain("openGraph:");
    expect(layoutSource).toContain("twitter:");
    expect(layoutSource).toContain("export const viewport");
    expect(layoutSource).toContain("themeColor:");
  });
});
