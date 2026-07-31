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
  const experience = page.locator("main#cubo");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(experience).toHaveAttribute("data-page-visible", "false");

  const at160 = await readMechanicalCheckpoint(page, 160);
  expect(at160.registrations).toHaveLength(4);
  expect(at160.registrations.every((mark) => mark.opacity > 0.95)).toBe(true);
  expect(at160.seal.opacity).toBeGreaterThan(0.9);
  expect(at160.seal.transform).not.toBe("none");
  await expect(experience).toHaveAttribute("data-intro-phase", "opening");

  const at450 = await readMechanicalCheckpoint(page, 450);
  expect(
    at450.interfaceSignals.some(
      (signal) => signal.opacity >= 0.25 && signal.overlapArea >= 200,
    ),
  ).toBe(true);
  await mkdir(VISUAL_ARTIFACT_DIRECTORY, { recursive: true });
  await page.screenshot({
    path: resolve(VISUAL_ARTIFACT_DIRECTORY, "mechanical-opening-450.png"),
  });
  expect(
    at450.apertureExposure.exposedSamples,
    `The 450ms aperture remained sealed: ${JSON.stringify(at450.apertureExposure)}`,
  ).toBeGreaterThanOrEqual(8);
  await expect(experience).toHaveAttribute("data-intro-phase", "opening");

  const at650 = await readMechanicalCheckpoint(page, 650);
  expect(new Set(at650.flaps.map((flap) => flap.transform)).size).toBe(4);
  expect(at650.paperOpacity).toBeLessThan(1);
  expect(at650.innerFaceOpacity).toBeLessThan(1);
  expect(at650.apertureBackground).toBe("rgba(0, 0, 0, 0)");
  expect(
    at650.interfaceSignals.some(
      (signal) => signal.opacity >= 0.75 && signal.overlapArea >= 500,
    ),
  ).toBe(true);
  await page.screenshot({
    path: resolve(VISUAL_ARTIFACT_DIRECTORY, "mechanical-opening-650.png"),
  });
  await expect(experience).toHaveAttribute("data-intro-phase", "opening");

  const at900 = await readMechanicalCheckpoint(page, 900);
  expect(at900.flaps).toHaveLength(4);
  expect(at900.flaps.every((flap) => flap.backfaceVisibility === "visible")).toBe(
    true,
  );
  expect(at900.flaps.every((flap) => flap.opacity > 0.95)).toBe(true);
  expect(at900.flaps.every((flap) => flap.area >= 1_000)).toBe(true);
  expect(
    at900.flapSurfaceSamples.every((samples) => samples >= 8),
    `Every opened inner plane must win the visual stack: ${JSON.stringify(at900.flapSurfaceSamples)}`,
  ).toBe(true);
  await page.screenshot({
    path: resolve(VISUAL_ARTIFACT_DIRECTORY, "mechanical-opening-900.png"),
  });
  await expect(experience).toHaveAttribute("data-intro-phase", "opening");

  const at1100 = await readMechanicalCheckpoint(page, 1_100);
  expect(at1100.paperOpacity).toBeLessThanOrEqual(0.01);
  expect(at1100.innerFaceOpacity).toBeLessThanOrEqual(0.01);
  expect(at1100.flaps.every((flap) => flap.opacity < 1)).toBe(true);
  expect(at1100.flaps.every((flap) => flap.opacity >= 0.35)).toBe(true);
  expect(
    at1100.flapSurfaceSamples.every((samples) => samples >= 8),
    `Every fading inner plane must remain perceptible: ${JSON.stringify(at1100.flapSurfaceSamples)}`,
  ).toBe(true);
  expect(at1100.headerOpacity).toBeGreaterThan(0.95);
  expect(at1100.titleOpacity).toBeGreaterThan(0.9);
  expect(at1100.telemetryOpacity).toBeGreaterThan(0.8);
  await page.screenshot({
    path: resolve(VISUAL_ARTIFACT_DIRECTORY, "mechanical-opening-1100.png"),
  });
  await expect(experience).toHaveAttribute("data-intro-phase", "opening");

  const at1350 = await readMechanicalCheckpoint(page, 1_350);
  expect(at1350.timelineOpacity).toBeLessThanOrEqual(0.01);
  expect(at1350.wrapperBackground).toBe("rgba(0, 0, 0, 0)");
  await restoreVisiblePage(page);
  await resumeIntroAnimations(page);
  await expect.poll(
    () => experience.getAttribute("data-intro-phase"),
    { timeout: 2_000 },
  ).toMatch(/^(?:drop|ready)$/);
  expect([null, "none"]).toContain(
    await page.getByTestId("package-intro").evaluateAll((elements) =>
      elements.length === 0 ? null : getComputedStyle(elements[0]!).pointerEvents,
    ),
  );

  await expect(experience).toHaveAttribute(
    "data-intro-phase",
    "ready",
    { timeout: 2_000 },
  );
  await expect(page.getByTestId("package-intro")).toHaveCount(0);
  await diagnostics.assertClean();
  await context.close();
});

test("accepts the production keyframe name before watchdog rescue", async ({
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

  const animationName = await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    const timeline = document.querySelector<HTMLElement>(
      '[data-testid="package-intro-timeline"]',
    );
    if (!timeline) {
      throw new Error("Package timeline was unavailable");
    }
    const name = getComputedStyle(timeline).animationName.split(",")[0]!.trim();
    timeline.dispatchEvent(
      new AnimationEvent("animationend", {
        animationName: name,
        bubbles: true,
      }),
    );
    return name;
  });

  expect(animationName).toContain("intro-package-finish");
  await expect.poll(
    () => page.locator("main#cubo").getAttribute("data-intro-phase"),
    { timeout: 500 },
  ).not.toBe("opening");
  await restoreVisiblePage(page);
  await diagnostics.assertClean();
  await context.close();
});

test("pauses and resumes every finite intro animation with page visibility", async ({
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

  await page.evaluate(() => {
    for (const animation of document
      .getAnimations()
      .filter(
        (candidate) => candidate.effect?.getTiming().iterations === 1,
      )) {
      animation.currentTime = 0;
    }
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("main#cubo")).toHaveAttribute(
    "data-page-visible",
    "false",
  );
  const hiddenStart = await readFiniteIntroAnimations(page);
  expect(hiddenStart.length).toBeGreaterThan(20);
  const unpausedAnimations = hiddenStart.filter(
    (animation) => animation.playState !== "paused",
  );
  expect(
    unpausedAnimations,
    `Finite animations still running while hidden: ${JSON.stringify(unpausedAnimations)}`,
  ).toEqual([]);
  await page.waitForTimeout(140);
  const hiddenEnd = await readFiniteIntroAnimations(page);
  expect(hiddenEnd).toHaveLength(hiddenStart.length);
  hiddenEnd.forEach((animation, index) => {
    expect(animation.currentTime).toBeCloseTo(
      hiddenStart[index]!.currentTime,
      1,
    );
  });

  await restoreVisiblePage(page);
  await expect(page.locator("main#cubo")).toHaveAttribute(
    "data-page-visible",
    "true",
  );
  await page.waitForTimeout(140);
  const visibleEnd = await readFiniteIntroAnimations(page);
  expect(visibleEnd).toHaveLength(hiddenStart.length);
  visibleEnd.forEach((animation, index) => {
    expect(
      animation.currentTime,
      `Finite animation did not resume: ${JSON.stringify({ after: animation, before: hiddenEnd[index] })}`,
    ).toBeGreaterThan(
      hiddenEnd[index]!.currentTime + 40,
    );
  });

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
      const rect = element.getBoundingClientRect();
      return {
        area: rect.width * rect.height,
        backfaceVisibility: style.backfaceVisibility,
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

    const aperture = document.querySelector<HTMLElement>(
      '[data-testid="package-aperture"]',
    );
    if (!aperture) {
      throw new Error("Package aperture was unavailable for checkpoint");
    }
    const apertureRect = aperture.getBoundingClientRect();
    const interfaceSignals = [
      ...document.querySelectorAll<HTMLElement>('[data-testid="plotter-line"]'),
      document.querySelector<HTMLElement>("#cube-stage"),
      document.querySelector<HTMLElement>("header"),
    ]
      .filter((element): element is HTMLElement => Boolean(element))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const overlapWidth = Math.max(
          0,
          Math.min(rect.right, apertureRect.right) -
            Math.max(rect.left, apertureRect.left),
        );
        const overlapHeight = Math.max(
          0,
          Math.min(rect.bottom, apertureRect.bottom) -
            Math.max(rect.top, apertureRect.top),
        );
        return {
          opacity: Number(getComputedStyle(element).opacity),
          overlapArea: overlapWidth * overlapHeight,
        };
      });

    const packageBlocker = (element: Element) =>
      element.closest('[data-testid="package-intro-flap"]') ??
      element.closest('[data-testid="package-inner-face"]') ??
      element.closest('[data-testid="package-spine"]');
    const realInterface = (element: Element) =>
      !element.closest('[data-testid="package-intro"]') &&
      Boolean(
        element.closest("header") ??
          element.closest('[data-testid="workspace"]') ??
          element.closest("#cube-stage") ??
          element.closest('[data-testid="editorial-spine"]'),
      );
    const apertureExposure = { exposedSamples: 0, occludedSamples: 0 };
    for (let row = 1; row <= 5; row += 1) {
      for (let column = 1; column <= 7; column += 1) {
        const x = apertureRect.left + (apertureRect.width * column) / 8;
        const y = apertureRect.top + (apertureRect.height * row) / 6;
        const stack = document.elementsFromPoint(x, y);
        const interfaceIndex = stack.findIndex(realInterface);
        if (interfaceIndex < 0) {
          continue;
        }
        const isOccluded = stack
          .slice(0, interfaceIndex)
          .some((element) => Boolean(packageBlocker(element)));
        if (isOccluded) {
          apertureExposure.occludedSamples += 1;
        } else {
          apertureExposure.exposedSamples += 1;
        }
      }
    }

    const flapSurfaceSamples = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-testid="package-intro-flap"]',
      ),
      (flap) => {
        const rect = flap.getBoundingClientRect();
        let visibleSamples = 0;
        for (let row = 1; row <= 7; row += 1) {
          for (let column = 1; column <= 7; column += 1) {
            const x = rect.left + (rect.width * column) / 8;
            const y = rect.top + (rect.height * row) / 8;
            const firstPackageSurface = document
              .elementsFromPoint(x, y)
              .map(packageBlocker)
              .find(Boolean);
            if (firstPackageSurface === flap) {
              visibleSamples += 1;
            }
          }
        }
        return visibleSamples;
      },
    );

    return {
      apertureExposure,
      apertureBackground: getComputedStyle(
        aperture,
      ).backgroundColor,
      flaps: Array.from(
        document.querySelectorAll('[data-testid="package-intro-flap"]'),
        readMotion,
      ),
      flapSurfaceSamples,
      headerOpacity: Number(
        getComputedStyle(document.querySelector("header")!).opacity,
      ),
      innerFaceOpacity: Number(
        getComputedStyle(
          document.querySelector('[data-testid="package-inner-face"]')!,
        ).opacity,
      ),
      interfaceSignals,
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

async function readFiniteIntroAnimations(
  page: import("@playwright/test").Page,
) {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) => animation.effect?.getTiming().iterations === 1)
      .map((animation) => {
        const effect = animation.effect as KeyframeEffect;
        const target = effect.target;
        return {
          animationName:
            animation instanceof CSSAnimation ? animation.animationName : "",
          currentTime: Number(animation.currentTime),
          playState: animation.playState,
          pseudoElement: effect.pseudoElement,
          target:
            target instanceof Element
              ? target.getAttribute("data-testid") ??
                Array.from(target.classList).join(".") ??
                target.tagName
              : "unknown",
        };
      }),
  );
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
