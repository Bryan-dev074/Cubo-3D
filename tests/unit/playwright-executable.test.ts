import { describe, expect, it } from "vitest";

import { resolveChromeExecutablePath } from "@/tests/e2e/browser-executable";

describe("resolveChromeExecutablePath", () => {
  it("prefers and validates an explicit executable", () => {
    expect(
      resolveChromeExecutablePath({
        bundledPath: "/missing/bundled",
        env: { PLAYWRIGHT_EXECUTABLE_PATH: "/custom/chrome" },
        exists: (candidate) => candidate === "/custom/chrome",
        homeDirectory: "/home/cubo",
        platform: "linux",
      }),
    ).toBe("/custom/chrome");

    expect(() =>
      resolveChromeExecutablePath({
        bundledPath: "/missing/bundled",
        env: { PLAYWRIGHT_EXECUTABLE_PATH: "/missing/custom" },
        exists: () => false,
        homeDirectory: "/home/cubo",
        platform: "linux",
      }),
    ).toThrow("PLAYWRIGHT_EXECUTABLE_PATH does not exist");
  });

  it("uses Playwright's bundled Chromium before installed browsers", () => {
    expect(
      resolveChromeExecutablePath({
        bundledPath: "/playwright/chromium",
        env: {},
        exists: (candidate) =>
          candidate === "/playwright/chromium" ||
          candidate === "/usr/bin/google-chrome",
        homeDirectory: "/home/cubo",
        platform: "linux",
      }),
    ).toBeUndefined();
  });

  it.each([
    {
      expected: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      homeDirectory: "C:\\Users\\Cubo",
      platform: "win32" as const,
      present: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    },
    {
      expected:
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      homeDirectory: "/Users/cubo",
      platform: "darwin" as const,
      present:
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    },
    {
      expected: "/usr/bin/google-chrome-stable",
      homeDirectory: "/home/cubo",
      platform: "linux" as const,
      present: "/usr/bin/google-chrome-stable",
    },
  ])(
    "finds an installed Chrome candidate on $platform",
    ({ expected, homeDirectory, platform, present }) => {
      expect(
        resolveChromeExecutablePath({
          bundledPath: "/missing/bundled",
          env: {},
          exists: (candidate) => candidate === present,
          homeDirectory,
          platform,
        }),
      ).toBe(expected);
    },
  );

  it("fails with an actionable diagnostic when no browser exists", () => {
    expect(() =>
      resolveChromeExecutablePath({
        bundledPath: "/missing/bundled",
        env: {},
        exists: () => false,
        homeDirectory: "/home/cubo",
        platform: "linux",
      }),
    ).toThrow(
      "No Playwright Chromium or installed Chrome/Chromium executable was found",
    );
  });
});
