import { chromium, defineConfig, devices } from "@playwright/test";

import { resolveChromeExecutablePath } from "./tests/e2e/browser-executable";

const executablePath = resolveChromeExecutablePath({
  bundledPath: chromium.executablePath(),
});

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  outputDir: "test-results",
  reporter: [["line"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    colorScheme: "light",
    contextOptions: {
      reducedMotion: "reduce",
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath,
      args: [
        "--enable-webgl",
        "--ignore-gpu-blocklist",
      ],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command:
      "npm run build && npm run start -- --hostname 127.0.0.1 --port 4173",
    env: {
      NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:4173",
    },
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
