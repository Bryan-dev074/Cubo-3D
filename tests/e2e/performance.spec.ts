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
  const maxInteractionUpperBound =
    raw.events.length === 0 ? 16 : maxInteraction;
  const metrics = {
    cls,
    eventCount: raw.events.length,
    lcpMs: raw.lcp,
    longestEvents: [...raw.events]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 8),
    marks,
    maxInteractionMs: raw.events.length === 0 ? null : maxInteraction,
    maxInteractionUpperBoundMs: maxInteractionUpperBound,
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
    writeFile(
      resolve(durableMetricsDirectory, "cinematic-performance.json"),
      serializedMetrics,
    ),
  ]);

  expect(raw.supported.lcp, "largest-contentful-paint unsupported").toBe(true);
  expect(raw.supported.layoutShift, "layout-shift unsupported").toBe(true);
  expect(raw.supported.event, "Event Timing unsupported").toBe(true);
  expect(raw.lcp, "no LCP entry observed").not.toBeNull();
  expect(raw.lcp!).toBeGreaterThan(0);
  expect(raw.lcp!).toBeLessThan(2_500);
  expect(cls).toBeLessThan(0.1);
  // The observer reports interactions at or above its 16 ms threshold. An
  // empty list therefore proves the stronger upper bound instead of a failure.
  expect(maxInteractionUpperBound).toBeLessThan(200);

  await diagnostics.assertClean();
});

test("mobile-390 intro sustains a usable compositor cadence", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    hasTouch: true,
    isMobile: true,
    reducedMotion: "no-preference",
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    const diagnostics = monitorBrowser(page);
    await setDeterministicBrowserState(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("package-intro")).toHaveAttribute(
      "data-phase",
      "opening",
    );

    const raw = await page.evaluate(
      () =>
        new Promise<{ deltas: number[]; elapsedMs: number }>((resolve, reject) => {
          const deltas: number[] = [];
          const startedAt = performance.now();
          let previous: number | null = null;
          const frame = (now: number) => {
            if (previous !== null) {
              deltas.push(now - previous);
            }
            previous = now;
            const phase = document.querySelector<HTMLElement>("main#cubo")?.dataset
              .introPhase;
            if (phase === "ready") {
              resolve({ deltas, elapsedMs: now - startedAt });
              return;
            }
            if (now - startedAt > 4_000) {
              reject(new Error(`Mobile intro remained in ${phase ?? "unknown"}`));
              return;
            }
            requestAnimationFrame(frame);
          };
          requestAnimationFrame(frame);
        }),
    );
    const ordered = [...raw.deltas].sort((left, right) => left - right);
    const steadyOrdered = ordered.filter((duration) => duration <= 250);
    const percentile = (values: readonly number[], ratio: number) =>
      values[Math.min(values.length - 1, Math.ceil(values.length * ratio) - 1)] ??
      Number.POSITIVE_INFINITY;
    const metrics = {
      elapsedMs: raw.elapsedMs,
      framesOver100Ms: raw.deltas.filter((duration) => duration > 100).length,
      framesOver250Ms: raw.deltas.filter((duration) => duration > 250).length,
      framesOver34Ms: raw.deltas.filter((duration) => duration > 34).length,
      longFrameRatio:
        raw.deltas.filter((duration) => duration > 34).length / raw.deltas.length,
      longestFramesMs: [...raw.deltas]
        .sort((left, right) => right - left)
        .slice(0, 8),
      maximumFrameMs: Math.max(...raw.deltas),
      medianFrameMs: percentile(ordered, 0.5),
      p95FrameMs: percentile(ordered, 0.95),
      sampleCount: raw.deltas.length,
      steadyP95FrameMs: percentile(steadyOrdered, 0.95),
      viewport: { height: 844, width: 390 },
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
        testInfo.outputPath("mobile-intro-performance.json"),
        serializedMetrics,
      ),
      writeFile(
        resolve(durableMetricsDirectory, "mobile-intro-performance.json"),
        serializedMetrics,
      ),
    ]);

    expect(metrics.sampleCount).toBeGreaterThanOrEqual(45);
    expect(metrics.medianFrameMs).toBeLessThanOrEqual(25);
    expect(metrics.steadyP95FrameMs).toBeLessThanOrEqual(100);
    expect(metrics.longFrameRatio).toBeLessThanOrEqual(0.2);
    expect(metrics.framesOver250Ms).toBeLessThanOrEqual(3);
    expect(raw.elapsedMs).toBeLessThanOrEqual(2_700);
    await diagnostics.assertClean();
  } finally {
    await context.close();
  }
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
