import { createHash } from "node:crypto";
import { expect, type Locator, type Page } from "@playwright/test";

import { inverseMove } from "@/lib/cube/moves";
import { LAYER_NOTATION } from "@/lib/cube/notation";
import { generateScramble } from "@/lib/cube/scramble";
import type { CubeMove } from "@/lib/cube/types";
import { dictionaries } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";

export const SCRAMBLE_RANDOM_VALUE = 0.314_159_265;
export const SCRAMBLE_SEED = Math.floor(
  SCRAMBLE_RANDOM_VALUE * 0x1_0000_0000,
);

interface BrowserDiagnostics {
  readonly assertClean: () => Promise<void>;
  readonly consoleErrors: readonly string[];
  readonly failedRequests: readonly string[];
  readonly httpErrors: readonly string[];
  readonly hydrationWarnings: readonly string[];
  readonly pageErrors: readonly string[];
}

export function monitorBrowser(page: Page): BrowserDiagnostics {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const httpErrors: string[] = [];
  const hydrationWarnings: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error") {
      consoleErrors.push(text);
    }
    if (/hydration|server rendered|did not match/i.test(text)) {
      hydrationWarnings.push(text);
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    failedRequests.push(
      `${request.method()} ${request.url()} ${request.failure()?.errorText ?? ""}`,
    );
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      httpErrors.push(
        `${response.status()} ${response.request().method()} ${response.url()}`,
      );
    }
  });

  return {
    consoleErrors,
    failedRequests,
    httpErrors,
    hydrationWarnings,
    pageErrors,
    assertClean: async () => {
      await expect(
        page.locator(
          '[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay',
        ),
      ).toHaveCount(0);
      expect(pageErrors, "uncaught page errors").toEqual([]);
      expect(consoleErrors, "browser console errors").toEqual([]);
      expect(hydrationWarnings, "hydration warnings").toEqual([]);
      expect(failedRequests, "failed browser requests").toEqual([]);
      expect(httpErrors, "HTTP 4xx/5xx responses").toEqual([]);
    },
  };
}

export async function setDeterministicBrowserState(
  page: Page,
  locale: Locale = "es",
): Promise<void> {
  await page.addInitScript((initialLocale) => {
    window.localStorage.setItem("cubo3d-locale", initialLocale);
  }, locale);
}

export async function openExperience(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { level: 1, name: "Cubo Mágico 3D" }),
  ).toBeVisible();
  await waitForIntroReady(page);
  await page.waitForLoadState("networkidle");
}

export async function waitForIntroReady(page: Page): Promise<void> {
  await expect(page.locator("main#cubo")).toHaveAttribute(
    "data-intro-phase",
    "ready",
    { timeout: 10_000 },
  );
}

export async function waitForWebGLScene(page: Page): Promise<Locator> {
  const canvas = page.locator(".cube-scene canvas");
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  return canvas;
}

export async function startDeterministicScramble(page: Page): Promise<void> {
  const scramble = page.getByRole("button", { name: "Desordenar cubo" });
  await page.evaluate((randomValue) => {
    const testWindow = window as typeof window & {
      __restoreCubo3dRandomForTest?: () => void;
    };
    const originalRandom = Math.random;
    let active = true;

    function restore(): void {
      if (!active) {
        return;
      }
      active = false;
      document.removeEventListener("click", activate, true);
      window.removeEventListener("click", restore);
      Math.random = originalRandom;
      delete testWindow.__restoreCubo3dRandomForTest;
    }

    function activate(): void {
      Math.random = () => randomValue;
      window.addEventListener("click", restore, { once: true });
      setTimeout(restore, 0);
    }

    testWindow.__restoreCubo3dRandomForTest = restore;
    document.addEventListener("click", activate, {
      capture: true,
      once: true,
    });
  }, SCRAMBLE_RANDOM_VALUE);
  try {
    await scramble.click();
  } finally {
    await page.evaluate(() => {
      const testWindow = window as typeof window & {
        __restoreCubo3dRandomForTest?: () => void;
      };
      testWindow.__restoreCubo3dRandomForTest?.();
    });
  }
  await expect(scramble).toBeDisabled();
  await expect(page.getByTestId("telemetry-scramble-progress")).toHaveText(
    "20 / 20",
    { timeout: 30_000 },
  );
  await expect(scramble).toBeEnabled();
}

export async function ensureFaceControlsOpen(
  page: Page,
  locale: Locale = "es",
): Promise<void> {
  const dictionary = dictionaries[locale];
  const controls = page.getByRole("group", { name: dictionary.controlsGroup });
  if (await controls.isVisible().catch(() => false)) {
    return;
  }

  const utilities = page.getByRole("button", {
    name: dictionary.controlUtilities,
  });
  if (await utilities.count()) {
    await utilities.focus();
    await page.keyboard.press("Enter");
  }

  const show = page.getByRole("button", { name: dictionary.controlsShow });
  if (await show.isVisible().catch(() => false)) {
    await show.click();
  }
  await expect(controls).toBeVisible();
}

export async function requestHtmlMove(
  page: Page,
  move: CubeMove,
  expectedMoves: number,
  locale: Locale = "es",
): Promise<void> {
  await ensureFaceControlsOpen(page, locale);
  await page
    .getByRole("button", {
      name: localizedMoveName(move, locale),
      exact: true,
    })
    .click();
  await expect(page.getByTestId("telemetry-move-count")).toHaveText(
    String(expectedMoves),
    { timeout: 15_000 },
  );
}

export async function solveDeterministicChallenge(page: Page): Promise<void> {
  await startDeterministicScramble(page);
  const solution = [...generateScramble({ length: 20, seed: SCRAMBLE_SEED })]
    .reverse()
    .map(inverseMove);

  for (let index = 0; index < solution.length; index += 1) {
    await requestHtmlMove(page, solution[index], index + 1);
  }
}

export function localizedMoveName(
  move: CubeMove,
  locale: Locale,
): string {
  const dictionary = dictionaries[locale];
  const layer = LAYER_NOTATION.find(
    (candidate) =>
      candidate.axis === move.axis && candidate.layer === move.layer,
  );
  if (!layer) {
    throw new Error(`No layer label for ${JSON.stringify(move)}`);
  }

  const layerLabels = {
    right: dictionary.faceRight,
    left: dictionary.faceLeft,
    up: dictionary.faceUp,
    down: dictionary.faceDown,
    front: dictionary.faceFront,
    back: dictionary.faceBack,
    middle: dictionary.faceMiddle,
    equator: dictionary.faceEquator,
    standing: dictionary.faceStanding,
  };
  const direction =
    move.turns === layer.clockwiseTurns
      ? dictionary.directionClockwise
      : dictionary.directionCounterclockwise;
  return `${layerLabels[layer.id]} ${direction}`;
}

export function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function boxesOverlap(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
): boolean {
  return !(
    first.x + first.width <= second.x ||
    second.x + second.width <= first.x ||
    first.y + first.height <= second.y ||
    second.y + second.height <= first.y
  );
}
