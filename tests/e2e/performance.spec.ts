import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

import {
  monitorBrowser,
  openExperience,
  requestHtmlMove,
  setDeterministicBrowserState,
  startDeterministicScramble,
  waitForWebGLScene,
} from "@/tests/e2e/helpers";
import { createLayerMove, LAYER_NOTATION } from "@/lib/cube/notation";

interface RawLabMetrics {
  events: {
    readonly duration: number;
    readonly interactionId: number;
    readonly name: string;
    readonly startTime: number;
  }[];
  lcp: number | null;
  shifts: {
    readonly startTime: number;
    readonly value: number;
  }[];
  readonly supported: {
    readonly event: boolean;
    readonly layoutShift: boolean;
    readonly lcp: boolean;
  };
}

test.use({
  contextOptions: {
    reducedMotion: "no-preference",
  },
  screenshot: "off",
  trace: "off",
  viewport: { width: 1440, height: 900 },
});

test("production interaction path meets the local Chromium lab gates", async ({
  page,
}, testInfo) => {
  const diagnostics = monitorBrowser(page);
  await installMetricObservers(page);
  await setDeterministicBrowserState(page);
  await openExperience(page);
  await waitForWebGLScene(page);

  await mark(page, "scene-ready");
  await startDeterministicScramble(page);
  await mark(page, "scramble-complete");
  const right = LAYER_NOTATION.find((layer) => layer.id === "right")!;
  await requestHtmlMove(page, createLayerMove(right, "clockwise"), 1);
  await mark(page, "face-move-complete");
  await page.getByRole("button", { name: "Deshacer" }).click();
  await expect(page.getByTestId("telemetry-move-count")).toHaveText("0");
  await mark(page, "undo-complete");
  await page.getByRole("button", { name: "PT" }).click();
  await mark(page, "locale-complete");
  await page.getByRole("button", { name: "Ajuda" }).click();
  await mark(page, "help-open");
  await page.getByRole("button", { name: "Fechar ajuda" }).click();
  await mark(page, "help-closed");
  await page.waitForTimeout(1_000);

  const { marks, raw } = await page.evaluate(() => ({
    marks: performance.getEntriesByType("mark").map((entry) => ({
      name: entry.name,
      startTime: entry.startTime,
    })),
    raw: (
        window as typeof window & {
          __cuboLabMetrics: RawLabMetrics;
        }
      ).__cuboLabMetrics,
  }));
  const cls = calculateSessionWindowCls(raw.shifts);
  const maxInteraction = raw.events.reduce(
    (maximum, event) => Math.max(maximum, event.duration),
    0,
  );
  const metrics = {
    cls,
    eventCount: raw.events.length,
    lcpMs: raw.lcp,
    longestEvents: [...raw.events]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 8),
    marks,
    maxInteractionMs: maxInteraction,
    supported: raw.supported,
  };

  const serializedMetrics = `${JSON.stringify(metrics, null, 2)}\n`;
  const durableMetricsDirectory = resolve(
    process.cwd(),
    ".superpowers",
    "sdd",
  );
  await mkdir(durableMetricsDirectory, { recursive: true });
  await Promise.all([
    writeFile(
      testInfo.outputPath("performance-metrics.json"),
      serializedMetrics,
    ),
    writeFile(
      resolve(durableMetricsDirectory, "task-6-performance.json"),
      serializedMetrics,
    ),
  ]);

  expect(raw.supported.lcp, "largest-contentful-paint unsupported").toBe(true);
  expect(raw.supported.layoutShift, "layout-shift unsupported").toBe(true);
  expect(raw.supported.event, "Event Timing unsupported").toBe(true);
  expect(raw.lcp, "no LCP entry observed").not.toBeNull();
  expect(raw.events.length, "no Event Timing interaction observed").toBeGreaterThan(0);
  expect(raw.lcp!).toBeGreaterThan(0);
  expect(raw.lcp!).toBeLessThan(2_500);
  expect(cls).toBeLessThan(0.1);
  expect(maxInteraction).toBeGreaterThan(0);
  expect(maxInteraction).toBeLessThan(200);

  await diagnostics.assertClean();
});

async function mark(
  page: import("@playwright/test").Page,
  name: string,
): Promise<void> {
  await page.evaluate((label) => performance.mark(label), name);
}

async function installMetricObservers(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const supported = PerformanceObserver.supportedEntryTypes;
    const metrics: RawLabMetrics = {
      events: [],
      lcp: null,
      shifts: [],
      supported: {
        event: supported.includes("event"),
        layoutShift: supported.includes("layout-shift"),
        lcp: supported.includes("largest-contentful-paint"),
      },
    };
    (
      window as typeof window & {
        __cuboLabMetrics: RawLabMetrics;
      }
    ).__cuboLabMetrics = metrics;

    if (metrics.supported.lcp) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          metrics.lcp = Math.max(metrics.lcp ?? 0, entry.startTime);
        }
      }).observe({
        buffered: true,
        type: "largest-contentful-paint",
      });
    }

    if (metrics.supported.layoutShift) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            readonly hadRecentInput: boolean;
            readonly value: number;
          };
          if (!shift.hadRecentInput) {
            (metrics.shifts as { startTime: number; value: number }[]).push({
              startTime: shift.startTime,
              value: shift.value,
            });
          }
        }
      }).observe({
        buffered: true,
        type: "layout-shift",
      });
    }

    if (metrics.supported.event) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const event = entry as PerformanceEntry & {
            readonly duration: number;
            readonly interactionId: number;
            readonly name: string;
          };
          if (event.interactionId > 0) {
            (
              metrics.events as {
                duration: number;
                interactionId: number;
                name: string;
                startTime: number;
              }[]
            ).push({
              duration: event.duration,
              interactionId: event.interactionId,
              name: event.name,
              startTime: event.startTime,
            });
          }
        }
      }).observe({
        buffered: true,
        durationThreshold: 16,
        type: "event",
      } as PerformanceObserverInit);
    }
  });
}

function calculateSessionWindowCls(
  shifts: readonly { readonly startTime: number; readonly value: number }[],
): number {
  let maximum = 0;
  let sessionStart = 0;
  let previous = 0;
  let sessionValue = 0;

  for (const shift of [...shifts].sort((a, b) => a.startTime - b.startTime)) {
    const continuesSession =
      sessionValue > 0 &&
      shift.startTime - previous < 1_000 &&
      shift.startTime - sessionStart < 5_000;
    if (continuesSession) {
      sessionValue += shift.value;
    } else {
      sessionStart = shift.startTime;
      sessionValue = shift.value;
    }
    previous = shift.startTime;
    maximum = Math.max(maximum, sessionValue);
  }

  return maximum;
}
