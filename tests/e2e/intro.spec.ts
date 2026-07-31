import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

import { monitorBrowser, setDeterministicBrowserState } from "@/tests/e2e/helpers";

const VISUAL_ARTIFACT_DIRECTORY = resolve(
  process.cwd(),
  ".superpowers",
  "sdd",
);

interface IntroPhaseProbe {
  readonly flapAnimationNames: readonly string[] | null;
  readonly records: readonly {
    readonly phase: string;
    readonly time: number;
  }[];
}

const VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "tablet-900", width: 900, height: 900 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-320", width: 320, height: 700 },
] as const;

for (const viewport of VIEWPORTS) {
  test(`${viewport.name} reveals the real interface after the package opens`, async ({
    browser,
  }) => {
    const mobile = viewport.width <= 390;
    const context = await browser.newContext({
      baseURL: "http://127.0.0.1:4173",
      hasTouch: mobile,
      isMobile: mobile,
      reducedMotion: "no-preference",
      viewport,
    });
    const page = await context.newPage();
    const diagnostics = monitorBrowser(page);
    await setDeterministicBrowserState(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const intro = page.getByTestId("package-intro");
    await expect(intro).toHaveAttribute("data-phase", "opening");
    if (viewport.name === "desktop-1440") {
      await expect(page.getByTestId("adaptive-cursor")).toHaveAttribute(
        "data-mode",
        "disabled",
      );
    }
    const transition = await page.evaluate(
      () =>
        new Promise<{
          flapRects: Array<{ bottom: number; left: number; right: number; top: number }>;
          overlay: {
            paperOpacity: string;
            pointerEvents: string;
            timelineOpacity: string;
            wrapperBackground: string;
          };
          phase: string;
          timelineRect: { bottom: number; left: number; right: number; top: number };
        }>((resolve, reject) => {
          const main = document.querySelector("main");
          const element = document.querySelector<HTMLElement>(
            '[data-testid="package-intro"]',
          );
          const timelineElement = document.querySelector<HTMLElement>(
            '[data-testid="package-intro-timeline"]',
          );
          if (!main || !element || !timelineElement) {
            reject(new Error("Package intro was not available for capture"));
            return;
          }

          const rect = (node: Element) => {
            const box = node.getBoundingClientRect();
            return {
              bottom: box.bottom,
              left: box.left,
              right: box.right,
              top: box.top,
            };
          };
          const timelineRect = rect(timelineElement);
          const flapRects = Array.from(
            document.querySelectorAll('[data-testid="package-intro-flap"]'),
            rect,
          );
          const timeout = window.setTimeout(() => {
            observer.disconnect();
            reject(new Error("Intro never exposed its reveal/drop transition"));
          }, 4_000);
          const capture = () => {
            const phase = main.getAttribute("data-intro-phase") ?? "";
            if (phase !== "reveal" && phase !== "drop") {
              return;
            }
            window.clearTimeout(timeout);
            observer.disconnect();
            const paper = getComputedStyle(element, "::before");
            const timelineStyles = getComputedStyle(timelineElement);
            const styles = getComputedStyle(element);
            resolve({
              flapRects,
              overlay: {
                paperOpacity: paper.opacity,
                pointerEvents: styles.pointerEvents,
                timelineOpacity: timelineStyles.opacity,
                wrapperBackground: styles.backgroundColor,
              },
              phase,
              timelineRect,
            });
          };
          const observer = new MutationObserver(capture);
          observer.observe(main, {
            attributeFilter: ["data-intro-phase"],
            attributes: true,
          });
          capture();
        }),
    );
    const { overlay, phase } = transition;

    expect(transition.timelineRect.left).toBeGreaterThanOrEqual(0);
    expect(transition.timelineRect.top).toBeGreaterThanOrEqual(0);
    expect(transition.timelineRect.right).toBeLessThanOrEqual(viewport.width);
    expect(transition.timelineRect.bottom).toBeLessThanOrEqual(viewport.height);
    for (const flapRect of transition.flapRects) {
      expect(flapRect.right).toBeGreaterThanOrEqual(0);
      expect(flapRect.bottom).toBeGreaterThanOrEqual(0);
      expect(flapRect.left).toBeLessThanOrEqual(viewport.width);
      expect(flapRect.top).toBeLessThanOrEqual(viewport.height);
    }

    expect(overlay.wrapperBackground).toBe("rgba(0, 0, 0, 0)");
    expect(overlay.paperOpacity).toBe("0");
    expect(overlay.timelineOpacity).toBe("0");
    expect(["reveal", "drop"]).toContain(phase);
    expect(overlay.pointerEvents).toBe("none");
    await expect(
      page.getByRole("heading", { level: 1, name: "Cubo Mágico 3D" }),
    ).toBeVisible();
    await expect(page.locator("main#cubo")).toHaveAttribute(
      "data-intro-phase",
      "ready",
      { timeout: 4_000 },
    );
    await expect(intro).toHaveCount(0);
    await expect(page.locator(".cube-scene canvas")).toBeVisible();
    if (viewport.name === "desktop-1440") {
      await expect(page.getByTestId("adaptive-cursor")).toHaveAttribute(
        "data-mode",
        "idle",
      );
    }

    await diagnostics.assertClean();
    await context.close();
  });
}

test("captures the package opening and the real cube mid-drop from explicit phases", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    reducedMotion: "no-preference",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const diagnostics = monitorBrowser(page);
  await setDeterministicBrowserState(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const intro = page.getByTestId("package-intro");
  await expect(intro).toBeVisible();
  await expect(intro).toHaveAttribute("data-phase", "opening");
  const pausedAnimations = await setIntroAnimationTime(page, 650);
  expect(pausedAnimations).toBeGreaterThan(0);

  await mkdir(VISUAL_ARTIFACT_DIRECTORY, { recursive: true });
  await page.screenshot({
    path: resolve(
      VISUAL_ARTIFACT_DIRECTORY,
      "cinematic-mid-opening-desktop.png",
    ),
  });

  await resumeIntroAnimations(page);
  await pauseAtDropMidpoint(page);
  await expect(page.locator("main#cubo")).toHaveAttribute(
    "data-intro-phase",
    "drop",
  );
  await expect(page.locator("main#cubo")).toHaveAttribute(
    "data-page-visible",
    "false",
  );
  await page.screenshot({
    path: resolve(
      VISUAL_ARTIFACT_DIRECTORY,
      "cinematic-mid-drop-desktop.png",
    ),
  });

  await restoreVisiblePage(page);
  await expect(page.locator("main#cubo")).toHaveAttribute(
    "data-intro-phase",
    "ready",
    { timeout: 4_000 },
  );
  await expect(intro).toHaveCount(0);
  await expect(page.locator(".cube-scene canvas")).toBeVisible();
  await diagnostics.assertClean();
  await context.close();
});

test("honors the mechanical package checkpoints before the 650 ms drop", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    reducedMotion: "no-preference",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const diagnostics = monitorBrowser(page);
  await setDeterministicBrowserState(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("package-intro")).toHaveAttribute(
    "data-phase",
    "opening",
  );
  await expect(page.locator(".cube-scene canvas")).toHaveCount(1);

  const at160 = await readMechanicalCheckpoint(page, 160);
  expect(at160.registrations).toHaveLength(4);
  expect(at160.registrations.every((mark) => mark.opacity > 0.95)).toBe(true);
  expect(at160.seal.opacity).toBeGreaterThan(0.9);
  expect(at160.seal.transform).not.toBe("none");

  const at650 = await readMechanicalCheckpoint(page, 650);
  expect(new Set(at650.flaps.map((flap) => flap.transform)).size).toBe(4);
  expect(at650.paperOpacity).toBeLessThan(1);
  expect(at650.innerFaceOpacity).toBeLessThan(1);
  expect(at650.apertureBackground).toBe("rgba(0, 0, 0, 0)");
  expect(at650.interfaceMounted).toBe(true);

  const at1100 = await readMechanicalCheckpoint(page, 1_100);
  expect(at1100.paperOpacity).toBeLessThanOrEqual(0.01);
  expect(at1100.innerFaceOpacity).toBeLessThanOrEqual(0.01);
  expect(at1100.flaps.every((flap) => flap.opacity < 1)).toBe(true);
  expect(at1100.headerOpacity).toBeGreaterThan(0.95);
  expect(at1100.titleOpacity).toBeGreaterThan(0.9);
  expect(at1100.telemetryOpacity).toBeGreaterThan(0.8);

  const at1350 = await readMechanicalCheckpoint(page, 1_350);
  expect(at1350.timelineOpacity).toBeLessThanOrEqual(0.01);
  expect(at1350.wrapperBackground).toBe("rgba(0, 0, 0, 0)");
  await expect.poll(
    () => page.locator("main#cubo").getAttribute("data-intro-phase"),
    { timeout: 2_000 },
  ).toMatch(/^(?:drop|ready)$/);
  expect([null, "none"]).toContain(
    await page.getByTestId("package-intro").evaluateAll((elements) =>
      elements.length === 0 ? null : getComputedStyle(elements[0]!).pointerEvents,
    ),
  );

  await resumeIntroAnimations(page);
  await expect(page.locator("main#cubo")).toHaveAttribute(
    "data-intro-phase",
    "ready",
    { timeout: 2_000 },
  );
  await expect(page.getByTestId("package-intro")).toHaveCount(0);
  await diagnostics.assertClean();
  await context.close();
});

test("reduced motion uses the short crossfade and reaches ready without spatial motion", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    reducedMotion: "reduce",
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const diagnostics = monitorBrowser(page);
  await setDeterministicBrowserState(page);
  await installIntroPhaseRecorder(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.locator("main#cubo")).toHaveAttribute(
    "data-intro-phase",
    "ready",
    { timeout: 1_000 },
  );
  const probe = await readRecordedIntroProbe(page);
  const opening = probe.records.find((record) => record.phase === "opening");
  const ready = probe.records.find((record) => record.phase === "ready");
  expect(opening).toBeDefined();
  expect(ready).toBeDefined();
  expect(ready!.time - opening!.time).toBeLessThanOrEqual(500);
  expect(probe.records.map((record) => record.phase)).not.toContain("drop");
  expect(probe.flapAnimationNames).toEqual([
    "none",
    "none",
    "none",
    "none",
  ]);
  await expect(page.getByTestId("package-intro")).toHaveCount(0);
  await expect(page.getByTestId("adaptive-cursor")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveAttribute(
    "data-cube-custom-cursor",
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Cubo Mágico 3D" }),
  ).toBeVisible();

  await diagnostics.assertClean();
  await context.close();
});

async function setIntroAnimationTime(
  page: import("@playwright/test").Page,
  globalTimeMs: number,
): Promise<number> {
  return page.evaluate((timelineTime) => {
    const intro = document.querySelector<HTMLElement>(
      '[data-testid="package-intro"]',
    );
    if (!intro) {
      throw new Error("Package intro was unavailable for phase capture");
    }

    const openingAnimation = (animation: Animation) => {
      return animation.effect?.getTiming().iterations === 1;
    };
    const animations = document
      .getAnimations()
      .filter(openingAnimation);
    for (const animation of animations) {
      animation.pause();
      // All package animations share one opening clock. CSS delays retain the
      // approved stagger when every animation receives the same timeline time.
      animation.currentTime = timelineTime;
    }
    return animations.length;
  }, globalTimeMs);
}

async function resumeIntroAnimations(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.evaluate(() => {
    const openingAnimation = (animation: Animation) => {
      return animation.effect?.getTiming().iterations === 1;
    };
    for (const animation of document
      .getAnimations()
      .filter(openingAnimation)) {
      animation.play();
    }
  });
}

async function readMechanicalCheckpoint(
  page: import("@playwright/test").Page,
  time: number,
) {
  await setIntroAnimationTime(page, time);
  return page.evaluate(() => {
    const readMotion = (element: Element | null) => {
      if (!element) {
        throw new Error("Mechanical checkpoint element was unavailable");
      }
      const style = getComputedStyle(element);
      return {
        opacity: Number(style.opacity),
        transform: style.transform,
      };
    };
    const intro = document.querySelector<HTMLElement>(
      '[data-testid="package-intro"]',
    );
    const timeline = document.querySelector<HTMLElement>(
      '[data-testid="package-intro-timeline"]',
    );
    if (!intro || !timeline) {
      throw new Error("Mechanical package was unavailable for checkpoint");
    }

    return {
      apertureBackground: getComputedStyle(
        document.querySelector('[data-testid="package-aperture"]')!,
      ).backgroundColor,
      flaps: Array.from(
        document.querySelectorAll('[data-testid="package-intro-flap"]'),
        readMotion,
      ),
      headerOpacity: Number(
        getComputedStyle(document.querySelector("header")!).opacity,
      ),
      innerFaceOpacity: Number(
        getComputedStyle(
          document.querySelector('[data-testid="package-inner-face"]')!,
        ).opacity,
      ),
      interfaceMounted: Boolean(
        document.querySelector("header") &&
          document.querySelector('[data-testid="workspace"]') &&
          document.querySelector('[data-testid="plotter-title"]'),
      ),
      paperOpacity: Number(getComputedStyle(intro, "::before").opacity),
      pointerEvents: getComputedStyle(intro).pointerEvents,
      registrations: Array.from(
        document.querySelectorAll('[data-testid="package-registration"]'),
        readMotion,
      ),
      seal: readMotion(document.querySelector('[data-testid="package-seal"]')),
      telemetryOpacity: Number(
        getComputedStyle(
          document.querySelector('[data-testid="live-telemetry"]')!,
        ).opacity,
      ),
      timelineOpacity: Number(getComputedStyle(timeline).opacity),
      titleOpacity: Number(
        getComputedStyle(
          document.querySelector('[data-testid="plotter-line"]')!,
        ).opacity,
      ),
      wrapperBackground: getComputedStyle(intro).backgroundColor,
    };
  });
}

async function pauseAtDropMidpoint(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolvePromise, reject) => {
        const main = document.querySelector<HTMLElement>("main#cubo");
        if (!main) {
          reject(new Error("Experience shell was unavailable for drop capture"));
          return;
        }

        const timeout = window.setTimeout(() => {
          observer.disconnect();
          reject(new Error("Intro never entered its drop phase"));
        }, 4_000);
        const pause = () => {
          if (main.dataset.introPhase !== "drop") {
            return;
          }
          observer.disconnect();
          window.clearTimeout(timeout);
          window.setTimeout(() => {
            Object.defineProperty(document, "visibilityState", {
              configurable: true,
              get: () => "hidden",
            });
            document.dispatchEvent(new Event("visibilitychange"));
            window.setTimeout(resolvePromise, 0);
          }, 280);
        };
        const observer = new MutationObserver(pause);
        observer.observe(main, {
          attributeFilter: ["data-intro-phase"],
          attributes: true,
        });
        pause();
      }),
  );
}

async function restoreVisiblePage(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "visibilityState");
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

async function installIntroPhaseRecorder(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.addInitScript(() => {
    const testWindow = window as typeof window & {
      __cubo3dIntroProbe?: {
        flapAnimationNames: string[] | null;
        records: Array<{ phase: string; time: number }>;
      };
    };
    const probe: {
      flapAnimationNames: string[] | null;
      records: Array<{ phase: string; time: number }>;
    } = {
      flapAnimationNames: null,
      records: [],
    };
    testWindow.__cubo3dIntroProbe = probe;

    let previous = "";
    const record = () => {
      const phase =
        document.querySelector<HTMLElement>("main#cubo")?.dataset.introPhase ??
        "";
      if (!phase || phase === previous) {
        return;
      }
      previous = phase;
      probe.records.push({ phase, time: performance.now() });
      if (phase === "opening") {
        probe.flapAnimationNames = Array.from(
          document.querySelectorAll('[data-testid="package-intro-flap"]'),
          (flap) => getComputedStyle(flap).animationName,
        );
      }
    };
    const observer = new MutationObserver(record);
    observer.observe(document, {
      attributeFilter: ["data-intro-phase"],
      attributes: true,
      childList: true,
      subtree: true,
    });
    record();
  });
}

async function readRecordedIntroProbe(
  page: import("@playwright/test").Page,
): Promise<IntroPhaseProbe> {
  return page.evaluate(
    () =>
      (
        window as typeof window & {
          __cubo3dIntroProbe?: {
            flapAnimationNames: string[] | null;
            records: Array<{ phase: string; time: number }>;
          };
        }
      ).__cubo3dIntroProbe ?? {
        flapAnimationNames: null,
        records: [],
      },
  );
}
