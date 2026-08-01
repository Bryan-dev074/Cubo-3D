import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

import {
  monitorBrowser,
  setDeterministicBrowserState,
} from "@/tests/e2e/helpers";

const VISUAL_ARTIFACT_DIRECTORY = resolve(
  process.cwd(),
  ".superpowers",
  "sdd",
);

interface IntroPhaseProbe {
  readonly flapAnimationNames: readonly string[] | null;
  readonly infiniteAnimationCounts: {
    readonly midpoint: number | null;
    readonly opening: number | null;
    readonly ready: number | null;
  };
  readonly reducedAnimations:
    | readonly {
        readonly duration: number;
        readonly iterations: number;
        readonly name: string;
        readonly properties: readonly string[];
      }[]
    | null;
  readonly reducedMidpoint: readonly ReducedElementSnapshot[] | null;
  readonly reducedOpening: readonly ReducedElementSnapshot[] | null;
  readonly records: readonly {
    readonly phase: string;
    readonly time: number;
  }[];
}

interface ReducedElementSnapshot {
  readonly bottom: number;
  readonly key: string;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly transform: string;
}

const VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "tablet-900", width: 900, height: 900 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-320", width: 320, height: 568 },
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
            paperOpacity: number;
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
            const backingPanels = Array.from(
              element.querySelectorAll<HTMLElement>(
                '[data-testid="package-backing-panel"]',
              ),
            );
            const timelineStyles = getComputedStyle(timelineElement);
            const styles = getComputedStyle(element);
            resolve({
              flapRects,
              overlay: {
                paperOpacity: Math.max(
                  0,
                  ...backingPanels.map((panel) =>
                    Number(getComputedStyle(panel).opacity),
                  ),
                ),
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
    expect(overlay.paperOpacity).toBeLessThanOrEqual(0.01);
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

test("mobile-390 keeps the package handoff on compositor-friendly motion", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    hasTouch: true,
    isMobile: true,
    reducedMotion: "no-preference",
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const diagnostics = monitorBrowser(page);
  await setDeterministicBrowserState(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("package-intro")).toHaveAttribute(
    "data-phase",
    "opening",
  );

  const clipPaths: string[][] = [];
  for (const openingTime of [719, 810, 900]) {
    await setOpeningAnimationTime(page, openingTime);
    clipPaths.push(
      await page.getByTestId("package-backing-surface").evaluateAll((surfaces) =>
        surfaces.map((surface) => getComputedStyle(surface).clipPath),
      ),
    );
  }
  expect(clipPaths[0]).toHaveLength(4);
  expect(clipPaths[1]).toEqual(clipPaths[0]);
  expect(clipPaths[2]).toEqual(clipPaths[0]);

  const audit = await page.evaluate(() => {
    const metadata = new Set([
      "composite",
      "computedOffset",
      "easing",
      "offset",
    ]);
    const animations = document
      .getAnimations()
      .filter((animation) => animation.effect?.getTiming().iterations === 1)
      .map((animation) => {
        const effect = animation.effect as KeyframeEffect;
        const target = effect.target;
        const properties = Array.from(
          new Set(
            effect
              .getKeyframes()
              .flatMap((keyframe) => Object.keys(keyframe))
              .filter((property) => !metadata.has(property)),
          ),
        ).sort();
        return {
          name:
            animation instanceof CSSAnimation ? animation.animationName : "",
          properties,
          target:
            target instanceof Element
              ? target.getAttribute("data-testid") ?? target.tagName
              : effect.pseudoElement ?? "unknown",
        };
      });
    const movingParticipants = Array.from(
      document.querySelectorAll<HTMLElement>(
        [
          '[data-testid="package-backing-panel"]',
          '[data-testid="package-ground-shadow"]',
          '[data-testid="package-intro-flap"]',
        ].join(","),
      ),
      (element) => ({
        filter: getComputedStyle(element).filter,
        testId: element.dataset.testid ?? "unknown",
        willChange: getComputedStyle(element).willChange,
      }),
    );
    return {
      animations,
      movingParticipants,
      panelCount: document.querySelectorAll(
        '[data-testid="package-backing-panel"]',
      ).length,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    };
  });

  expect(audit.panelCount).toBe(4);
  expect(audit.animations.length).toBeGreaterThan(20);
  for (const animation of audit.animations) {
    expect(animation.properties.length, animation.name).toBeGreaterThan(0);
    expect(
      animation.properties.every((property) =>
        ["opacity", "transform"].includes(property),
      ),
      `${animation.name} animates ${animation.properties.join(", ")}`,
    ).toBe(true);
  }
  for (const participant of audit.movingParticipants) {
    expect(participant.filter, participant.testId).toBe("none");
    expect(participant.willChange, participant.testId).toBe("auto");
  }
  expect(audit.scrollWidth).toBe(audit.viewportWidth);

  await diagnostics.assertClean();
  await context.close();
});

test("captures the package opening and the real cube mid-drop from explicit phases", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    reducedMotion: "no-preference",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.clock.install({ time: new Date("2026-08-01T12:00:00.000Z") });
  const diagnostics = monitorBrowser(page);
  await setDeterministicBrowserState(page);
  await page.addInitScript(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const intro = page.getByTestId("package-intro");
  await expect(intro).toBeVisible();
  await expect(intro).toHaveAttribute("data-phase", "opening");
  const pausedAnimations = await setOpeningAnimationTime(page, 650);
  expect(pausedAnimations).toBeGreaterThan(0);

  await mkdir(VISUAL_ARTIFACT_DIRECTORY, { recursive: true });
  await page.screenshot({
    path: resolve(
      VISUAL_ARTIFACT_DIRECTORY,
      "cinematic-mid-opening-desktop.png",
    ),
  });

  await resumeIntroAnimations(page);
  const experience = page.locator("main#cubo");
  await expect(experience).toHaveAttribute("data-intro-phase", "drop", {
    timeout: 4_000,
  });
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
  await restoreVisiblePage(page);
  await expect(experience).toHaveAttribute("data-page-visible", "true");
  await page.clock.runFor(280);
  await expect(page.locator("main#cubo")).toHaveAttribute(
    "data-intro-phase",
    "drop",
  );
  await page.screenshot({
    path: resolve(
      VISUAL_ARTIFACT_DIRECTORY,
      "cinematic-mid-drop-desktop.png",
    ),
  });

  await page.clock.runFor(400);
  await expect(experience).toHaveAttribute(
    "data-intro-phase",
    "ready",
    { timeout: 4_000 },
  );
  await expect(intro).toHaveCount(0);
  await expect(page.locator(".cube-scene canvas")).toBeVisible();
  await diagnostics.assertClean();
  await context.close();
});

test("honors the mechanical checkpoints from package to live interface", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    reducedMotion: "no-preference",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.clock.install({ time: new Date("2026-08-01T12:00:00.000Z") });
  const diagnostics = monitorBrowser(page);
  await setDeterministicBrowserState(page);
  await page.addInitScript(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("package-intro")).toHaveAttribute(
    "data-phase",
    "opening",
  );
  await expect(page.locator(".cube-scene canvas")).toHaveCount(1);
  const experience = page.locator("main#cubo");
  await expect(experience).toHaveAttribute("data-page-visible", "false");

  const at160 = await readOpeningCheckpoint(page, 160);
  expect(
    at160.packageShadow.animationNames.some((name) =>
      name.includes("package-ground-settle"),
    ),
  ).toBe(true);
  expect(at160.packageShadow.opacity).toBeGreaterThan(0.12);
  expect(at160.registrations.every((mark) => mark.animationNames.length > 0)).toBe(
    true,
  );
  expect(at160.sealHalves.every((half) => half.transform !== "none")).toBe(true);
  await expect(experience).toHaveAttribute("data-intro-phase", "opening");
  await mkdir(VISUAL_ARTIFACT_DIRECTORY, { recursive: true });
  await page.screenshot({
    path: resolve(VISUAL_ARTIFACT_DIRECTORY, "dieline-160.png"),
  });

  const at450 = await readOpeningCheckpoint(page, 450);
  expect(at450.panels.every((panel) => panel.openAngle > 70)).toBe(true);
  expect(at450.panels.every((panel) => panel.innerFaceVisible)).toBe(true);
  expect(at450.panels.every((panel) => panel.edgeVisible)).toBe(true);
  await page.screenshot({
    path: resolve(VISUAL_ARTIFACT_DIRECTORY, "dieline-450.png"),
  });
  await expect(experience).toHaveAttribute("data-intro-phase", "opening");

  const at650 = await readOpeningCheckpoint(page, 650);
  expect(
    at650.panels.every(
      (panel) =>
        panel.openAngle >= 82 &&
        panel.openAngle <= 96 &&
        panel.projectionRatio < 0.35,
    ),
  ).toBe(true);
  await page.screenshot({
    path: resolve(VISUAL_ARTIFACT_DIRECTORY, "dieline-650.png"),
  });
  await expect(experience).toHaveAttribute("data-intro-phase", "opening");

  const at900 = await readOpeningCheckpoint(page, 900);
  expect(at900.panelDestinations).toEqual(["header", "telemetry", "dock", "hero"]);
  const panelsByDestination = Object.fromEntries(
    at900.panels.map((panel) => [panel.destination, panel]),
  );
  expect(panelsByDestination.header!.centerY).toBeLessThan(
    at900.shellRect.centerY - 150,
  );
  expect(panelsByDestination.telemetry!.centerX).toBeGreaterThan(
    at900.shellRect.centerX + 250,
  );
  expect(panelsByDestination.dock!.centerY).toBeGreaterThan(
    at900.shellRect.centerY + 180,
  );
  expect(panelsByDestination.hero!.centerX).toBeLessThan(
    at900.shellRect.centerX - 250,
  );
  expect(at900.panels.every((panel) => panel.travelDistance > 180)).toBe(true);
  expect(at900.planInkOpacity).toBeGreaterThan(0.01);
  await page.screenshot({
    path: resolve(VISUAL_ARTIFACT_DIRECTORY, "dieline-900.png"),
  });
  await expect(experience).toHaveAttribute("data-intro-phase", "opening");

  const at1100 = await readOpeningCheckpoint(page, 1_100);
  expect(at1100.titleCoverage).toBeLessThanOrEqual(0.01);
  expect(at1100.backingOpacity).toBeLessThanOrEqual(0.01);
  expect(at1100.shellBackingOpacity).toBeLessThanOrEqual(0.01);
  expect(at1100.packageSurfaceOpacity).toBeLessThanOrEqual(0.01);
  await page.screenshot({
    path: resolve(VISUAL_ARTIFACT_DIRECTORY, "dieline-1100.png"),
  });
  await expect(experience).toHaveAttribute("data-intro-phase", "opening");

  const at1350 = await readOpeningCheckpoint(page, 1_350);
  expect(at1350.openingCompletionCurrentTime).toBe(1_350);
  expect(at1350.timelineOpacity).toBeLessThanOrEqual(0.01);
  expect(at1350.backingOpacity).toBeLessThanOrEqual(0.01);
  expect(at1350.shellBackingOpacity).toBeLessThanOrEqual(0.01);
  expect(at1350.packageSurfaceOpacity).toBeLessThanOrEqual(0.01);
  expect(at1350.introPointerEvents).toBe("none");
  await expect(experience).toHaveAttribute("data-intro-phase", "opening");
  await page.screenshot({
    path: resolve(VISUAL_ARTIFACT_DIRECTORY, "dieline-1350.png"),
  });
  await page.evaluate(() => {
    const testWindow = window as typeof window & {
      __cubo3dReleaseExactOpening?: () => void;
    };
    testWindow.__cubo3dReleaseExactOpening?.();
    const timeline = document.querySelector<HTMLElement>(
      '[data-testid="package-intro-timeline"]',
    );
    const completion = timeline?.getAnimations().find(
      (animation) =>
        animation instanceof CSSAnimation &&
        animation.animationName.includes("intro-package-finish"),
    );
    if (!timeline || !(completion instanceof CSSAnimation)) {
      throw new Error("Production opening completion animation was unavailable");
    }
    const event = new Event("animationend", { bubbles: true });
    Object.defineProperty(event, "animationName", {
      value: completion.animationName,
    });
    timeline.dispatchEvent(event);
  });
  await expect(experience).toHaveAttribute("data-intro-phase", "drop", {
    timeout: 30_000,
  });
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "visibilityState");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(experience).toHaveAttribute("data-page-visible", "true");

  const dropTargets = [80, 260, 410, 470, 560, 590] as const;
  const dropCheckpoints = [];
  let previousTarget = 0;
  for (const target of dropTargets) {
    await page.clock.runFor(target - previousTarget);
    await expect(experience).toHaveAttribute("data-intro-phase", "drop");
    dropCheckpoints.push(await readCheckpointState(page));
    previousTarget = target;
  }
  const [at80, at260, at1760, atContact, atSettle, beforeReady] =
    dropCheckpoints;
  for (const [index, checkpoint] of dropCheckpoints.entries()) {
    expect(checkpoint!.phase).toBe("drop");
    expect(checkpoint!.cubeRect.pixelCount).toBeGreaterThan(1_000);
    expect(checkpoint!.cubeRect.width).toBeLessThan(
      checkpoint!.stageRect.width * 0.9,
    );
    expect(checkpoint!.cubeRect.left).toBeGreaterThanOrEqual(
      checkpoint!.stageRect.left - 1,
    );
    expect(checkpoint!.cubeRect.right).toBeLessThanOrEqual(
      checkpoint!.stageRect.right + 1,
    );
    expect(checkpoint!.cubeRect.top).toBeGreaterThanOrEqual(
      checkpoint!.stageRect.top - 1,
    );
    expect(checkpoint!.cubeRect.bottom).toBeLessThanOrEqual(
      checkpoint!.stageRect.bottom + 1,
    );
    const marginEvidence = JSON.stringify({
      canvas: checkpoint!.cubeRect.canvasMargins,
      capture: checkpoint!.cubeRect.captureMargins,
      elapsed: dropTargets[index],
    });
    expect(
      checkpoint!.cubeRect.touchesCanvasEdge,
      `Cube alpha touched its canvas edge: ${marginEvidence}`,
    ).toBe(false);
    expect(
      checkpoint!.cubeRect.touchesCaptureEdge,
      `Cube alpha touched its stage capture edge: ${marginEvidence}`,
    ).toBe(false);
    for (const margin of [
      ...Object.values(checkpoint!.cubeRect.canvasMargins),
      ...Object.values(checkpoint!.cubeRect.captureMargins),
    ]) {
      expect(margin).toBeGreaterThan(2);
    }
  }
  expect(at80!.cubeRect.alphaCenterY).toBeLessThan(
    at260!.cubeRect.alphaCenterY,
  );
  expect(at260!.cubeRect.alphaCenterY).toBeLessThan(
    at1760!.cubeRect.alphaCenterY,
  );
  expect(at1760!.cubeRect.alphaCenterY).toBeLessThan(
    atContact!.cubeRect.alphaCenterY,
  );
  expect(atSettle!.cubeRect.alphaCenterY).toBeGreaterThan(
    atContact!.cubeRect.alphaCenterY,
  );
  expect(beforeReady!.cubeRect.alphaCenterY).toBeLessThan(
    atSettle!.cubeRect.alphaCenterY,
  );
  await page.screenshot({
    path: resolve(VISUAL_ARTIFACT_DIRECTORY, "dieline-1760.png"),
  });

  await page.clock.runFor(80);
  await expect(experience).toHaveAttribute("data-intro-phase", "ready");
  const at2000 = await readCheckpointState(page);
  expect(at2000.phase).toBe("ready");
  expect(at2000.cubeRect.pixelCount).toBeGreaterThan(1_000);
  expect(at2000.cubeRect.touchesCanvasEdge).toBe(false);
  expect(at2000.cubeRect.touchesCaptureEdge).toBe(false);
  for (const margin of [
    ...Object.values(at2000.cubeRect.canvasMargins),
    ...Object.values(at2000.cubeRect.captureMargins),
  ]) {
    expect(margin).toBeGreaterThan(2);
  }
  expect(
    Math.abs(
      at2000.cubeRect.alphaCenterY - atContact!.cubeRect.alphaCenterY,
    ),
  ).toBeLessThan(5);
  expect(
    Math.abs(
      at2000.cubeRect.alphaCenterY - beforeReady!.cubeRect.alphaCenterY,
    ),
  ).toBeLessThan(5);
  await page.screenshot({
    path: resolve(VISUAL_ARTIFACT_DIRECTORY, "dieline-2000.png"),
  });
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
    { timeout: 4_000 },
  );
  const probe = await readRecordedIntroProbe(page);
  const opening = probe.records.find((record) => record.phase === "opening");
  const ready = probe.records.find((record) => record.phase === "ready");
  expect(opening).toBeDefined();
  expect(ready).toBeDefined();
  expect(ready!.time - opening!.time).toBeGreaterThanOrEqual(160);
  expect(probe.records.map((record) => record.phase)).not.toContain("drop");
  expect(probe.flapAnimationNames).toEqual([
    "none",
    "none",
    "none",
    "none",
  ]);
  expect(probe.reducedAnimations).toHaveLength(5);
  for (const animation of probe.reducedAnimations ?? []) {
    expect(animation.name).toContain("package-intro-reduced");
    expect(animation.duration).toBe(180);
    expect(animation.iterations).toBe(1);
    expect(animation.properties).toEqual(["opacity"]);
  }
  expect(probe.infiniteAnimationCounts).toEqual({
    midpoint: 0,
    opening: 0,
    ready: 0,
  });
  expect(probe.reducedOpening).not.toBeNull();
  expect(probe.reducedMidpoint).not.toBeNull();
  expect(probe.reducedMidpoint).toHaveLength(probe.reducedOpening!.length);
  for (const [index, start] of probe.reducedOpening!.entries()) {
    const midpoint = probe.reducedMidpoint![index]!;
    expect(midpoint.key).toBe(start.key);
    expect(midpoint.transform).toBe(start.transform);
    expect(midpoint.left).toBeCloseTo(start.left, 2);
    expect(midpoint.right).toBeCloseTo(start.right, 2);
    expect(midpoint.top).toBeCloseTo(start.top, 2);
    expect(midpoint.bottom).toBeCloseTo(start.bottom, 2);
  }
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

async function setOpeningAnimationTime(
  page: import("@playwright/test").Page,
  openingTimeMs: number,
): Promise<number> {
  if (openingTimeMs < 0 || openingTimeMs > 1_350) {
    throw new Error("Opening animation time must stay within 0-1350ms");
  }
  return page.evaluate((requestedTimelineTime) => {
    type ExactOpeningWindow = typeof window & {
      __cubo3dReleaseExactOpening?: () => void;
    };
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
    if (requestedTimelineTime === 1_350) {
      const timeline = intro.querySelector<HTMLElement>(
        '[data-testid="package-intro-timeline"]',
      );
      if (!timeline) {
        throw new Error("Package timeline was unavailable at 1350ms");
      }
      const exactOpeningWindow = window as ExactOpeningWindow;
      exactOpeningWindow.__cubo3dReleaseExactOpening?.();
      const holdOpeningPhase = (event: AnimationEvent) => {
        if (event.animationName.includes("intro-package-finish")) {
          event.stopImmediatePropagation();
        }
      };
      timeline.addEventListener("animationend", holdOpeningPhase, {
        capture: true,
      });
      exactOpeningWindow.__cubo3dReleaseExactOpening = () => {
        timeline.removeEventListener("animationend", holdOpeningPhase, {
          capture: true,
        });
        delete exactOpeningWindow.__cubo3dReleaseExactOpening;
      };
    }
    for (const animation of animations) {
      animation.pause();
      // All package animations share one opening clock. CSS delays retain the
      // approved stagger when every animation receives the same timeline time.
      animation.currentTime = requestedTimelineTime;
    }
    return animations.length;
  }, openingTimeMs);
}

async function resumeIntroAnimations(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.evaluate(() => {
    type ExactOpeningWindow = typeof window & {
      __cubo3dReleaseExactOpening?: () => void;
    };
    const openingAnimation = (animation: Animation) => {
      return animation.effect?.getTiming().iterations === 1;
    };
    const exactOpeningWindow = window as ExactOpeningWindow;
    const heldExactOpening = Boolean(
      exactOpeningWindow.__cubo3dReleaseExactOpening,
    );
    exactOpeningWindow.__cubo3dReleaseExactOpening?.();
    for (const animation of document
      .getAnimations()
      .filter(openingAnimation)) {
      animation.play();
    }
    if (heldExactOpening) {
      const timeline = document.querySelector<HTMLElement>(
        '[data-testid="package-intro-timeline"]',
      );
      if (!timeline) {
        throw new Error("Package timeline was unavailable for exact resume");
      }
      timeline.dispatchEvent(
        new AnimationEvent("animationend", {
          animationName: "intro-package-finish",
          bubbles: true,
        }),
      );
    }
  });
}

async function readOpeningCheckpoint(
  page: import("@playwright/test").Page,
  time: number,
) {
  await setOpeningAnimationTime(page, time);
  return readCheckpointState(page, false);
}

async function readCheckpointState(
  page: import("@playwright/test").Page,
  measureCube = true,
) {
  const cubeRect = measureCube
    ? await readVisibleCubeRect(page)
    : {
        alphaCenterY: 0,
        bottom: 0,
        centerX: 0,
        centerY: 0,
        height: 0,
        left: 0,
        pixelCount: 0,
        right: 0,
        top: 0,
        canvasMargins: { bottom: 0, left: 0, right: 0, top: 0 },
        captureMargins: { bottom: 0, left: 0, right: 0, top: 0 },
        touchesCanvasEdge: false,
        touchesCaptureEdge: false,
        width: 0,
      };
  return page.evaluate((visibleCubeRect) => {
    const readRect = (element: Element | null) => {
      if (!element) {
        throw new Error("Checkpoint rectangle element was unavailable");
      }
      const rect = element.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      };
    };
    const readMotion = (element: Element | null) => {
      if (!element) {
        throw new Error("Mechanical checkpoint element was unavailable");
      }
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const animations = document.getAnimations().filter((animation) => {
        const effect = animation.effect as KeyframeEffect | null;
        return effect?.target === element;
      });
      return {
        animationNames: animations.map((animation) =>
          animation instanceof CSSAnimation ? animation.animationName : "",
        ),
        area: rect.width * rect.height,
        backfaceVisibility: style.backfaceVisibility,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
        currentTimes: animations.map((animation) => Number(animation.currentTime)),
        hasDepth:
          style.transformStyle === "preserve-3d" &&
          style.transform !== "none",
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
    if ((intro && !timeline) || (!intro && timeline)) {
      throw new Error("Mechanical package was unavailable for checkpoint");
    }

    const panelElements = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-testid="package-intro-flap"]',
      ),
    );
    const shellRect = intro
      ? readRect(document.querySelector('[data-testid="package-shell"]'))
      : {
          bottom: 0,
          centerX: 0,
          centerY: 0,
          height: 0,
          left: 0,
          right: 0,
          top: 0,
          width: 0,
        };
    const panels = panelElements.map((panel) => {
      const motion = readMotion(panel);
      const matrix = new DOMMatrixReadOnly(motion.transform);
      const horizontal = panel.dataset.flap === "top" || panel.dataset.flap === "bottom";
      const openAngle = Math.abs(
        (Math.atan2(
          horizontal ? matrix.m23 : matrix.m13,
          horizontal ? matrix.m22 : matrix.m11,
        ) *
          180) /
          Math.PI,
      );
      const panelRect = panel.getBoundingClientRect();
      const inner = panel.querySelector<HTMLElement>('[data-face="inner"]');
      const edge = panel.querySelector<HTMLElement>('[data-testid="package-flap-edge"]');
      if (!inner || !edge) {
        throw new Error("Panel face geometry was unavailable");
      }
      const innerMatrix = new DOMMatrixReadOnly(getComputedStyle(inner).transform);
      const innerRect = inner.getBoundingClientRect();
      const edgeRect = edge.getBoundingClientRect();
      const intersection = (a: DOMRect, b: DOMRect) =>
        Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
        Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      return {
        ...motion,
        destination: panel.dataset.destination ?? "",
        edgeVisible:
          getComputedStyle(edge).boxShadow !== "none" &&
          intersection(panelRect, edgeRect) > 1,
        innerFaceVisible:
          (horizontal
            ? innerMatrix.m22 < -0.9
            : innerMatrix.m11 < -0.9) &&
          intersection(panelRect, innerRect) > 1,
        openAngle,
        projectionRatio: horizontal
          ? panelRect.height / panel.offsetHeight
          : panelRect.width / panel.offsetWidth,
        travelDistance: Math.hypot(
          motion.centerX - shellRect.centerX,
          motion.centerY - shellRect.centerY,
        ),
      };
    });
    const title = document.querySelector<HTMLElement>("#experience-title");
    const titleRect = title?.getBoundingClientRect();
    let packageSamples = 0;
    let titleSamples = 0;
    if (titleRect && titleRect.width > 0 && titleRect.height > 0) {
      for (let row = 1; row <= 8; row += 1) {
        for (let column = 1; column <= 12; column += 1) {
          titleSamples += 1;
          const x = titleRect.left + (titleRect.width * column) / 13;
          const y = titleRect.top + (titleRect.height * row) / 9;
          if (
            document
              .elementsFromPoint(x, y)
              .some((element) => element.closest('[data-testid="package-intro"]'))
          ) {
            packageSamples += 1;
          }
        }
      }
    }
    const effectiveOpacity = (element: Element) => {
      let opacity = 1;
      for (let node: Element | null = element; node; node = node.parentElement) {
        opacity *= Number(getComputedStyle(node).opacity);
        if (node === intro) {
          break;
        }
      }
      return opacity;
    };
    const packageSurfaceOpacity = intro
      ? Math.max(
          0,
          ...Array.from(
            intro.querySelectorAll<HTMLElement>(
              [
                '[data-testid="package-origin"]',
                '[data-testid="package-inner-face"]',
                '[data-testid="package-aperture"]',
                '[data-testid="package-spine"]',
                '[data-testid="package-serial"]',
                '[data-testid="package-registration"]',
                '[data-testid="package-rail"]',
                '[data-testid="package-hinge"]',
                '[data-testid="package-flap-face"]',
                '[data-testid="package-flap-print"]',
                '[data-testid="package-flap-edge"]',
                '[data-testid="package-seal"]',
                '[data-testid="package-seal-half"]',
              ].join(","),
            ),
            effectiveOpacity,
          ),
        )
      : 0;

    return {
      cubeRect: visibleCubeRect,
      openingCompletionCurrentTime: (() => {
        const completion = document.getAnimations().find((animation) => {
          return (
            "animationName" in animation &&
            String(animation.animationName).includes("intro-package-finish")
          );
        });
        return completion ? Number(completion.currentTime) : null;
      })(),
      backingOpacity: intro
        ? Math.max(
            0,
            ...Array.from(
              intro.querySelectorAll<HTMLElement>(
                '[data-testid="package-backing-panel"]',
              ),
              (panel) => Number(getComputedStyle(panel).opacity) * effectiveOpacity(panel),
            ),
          )
        : 0,
      introPointerEvents: intro ? getComputedStyle(intro).pointerEvents : "none",
      packageShadow: intro
        ? readMotion(document.querySelector('[data-testid="package-ground-shadow"]'))
        : {
            animationNames: [],
            area: 0,
            backfaceVisibility: "visible",
            centerX: 0,
            centerY: 0,
            currentTimes: [],
            hasDepth: false,
            opacity: 0,
            transform: "none",
          },
      panelDestinations: panels.map((panel) => panel.destination),
      panels,
      packageSurfaceOpacity,
      phase:
        document.querySelector<HTMLElement>("main#cubo")?.dataset.introPhase ?? "",
      planInkOpacity: Number(
        getComputedStyle(
          document.querySelector<HTMLElement>('[data-testid="packaging-plan"]')!,
        ).opacity,
      ),
      registrations: Array.from(
        document.querySelectorAll('[data-testid="package-registration"]'),
        readMotion,
      ),
      sealHalves: Array.from(
        document.querySelectorAll('[data-testid="package-seal-half"]'),
        readMotion,
      ),
      shellBackingOpacity: intro
        ? Number(
            getComputedStyle(
              document.querySelector<HTMLElement>('[data-testid="package-shell"]')!,
              "::before",
            ).opacity,
          ) * effectiveOpacity(
            document.querySelector<HTMLElement>('[data-testid="package-shell"]')!,
          )
        : 0,
      shellRect,
      stageRect: readRect(document.querySelector("#cube-stage")),
      timelineOpacity: timeline ? Number(getComputedStyle(timeline).opacity) : 0,
      titleCoverage: titleSamples === 0 ? 0 : packageSamples / titleSamples,
    };
  }, cubeRect);
}

async function readVisibleCubeRect(page: import("@playwright/test").Page) {
  const canvas = page.locator(".cube-scene canvas");
  const stage = page.locator("#cube-stage");
  const [canvasBox, captureBox] = await Promise.all([
    canvas.boundingBox(),
    stage.boundingBox(),
  ]);
  if (!canvasBox || !captureBox) {
    throw new Error("Cube canvas or stage had no screenshot bounds");
  }
  await page.evaluate(() => {
    const canvasElement = document.querySelector(".cube-scene canvas");
    if (!canvasElement) {
      throw new Error("Cube canvas was unavailable for isolated capture");
    }
    for (let node: Element | null = canvasElement; node; node = node.parentElement) {
      node.setAttribute("data-cubo-alpha-path", "true");
    }
    const style = document.createElement("style");
    style.id = "cubo-alpha-capture-style";
    style.textContent = `
      body * { visibility: hidden !important; }
      [data-cubo-alpha-path="true"] { visibility: visible !important; }
      html, body, body *, body *::before, body *::after {
        background: transparent !important;
        border-color: transparent !important;
        box-shadow: none !important;
        color: transparent !important;
        filter: none !important;
        outline: none !important;
      }
    `;
    document.head.append(style);
  });

  let pngBase64: string;
  try {
    pngBase64 = (await page.screenshot({
      clip: captureBox,
      omitBackground: true,
    })).toString("base64");
  } finally {
    await page.evaluate(() => {
      document.querySelector("#cubo-alpha-capture-style")?.remove();
      for (const element of document.querySelectorAll("[data-cubo-alpha-path]")) {
        element.removeAttribute("data-cubo-alpha-path");
      }
    });
  }

  return page.evaluate(
    async ({ canvasBounds, captureBounds, png }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${png}`;
      await image.decode();
      const scratch = document.createElement("canvas");
      scratch.width = image.naturalWidth;
      scratch.height = image.naturalHeight;
      const context = scratch.getContext("2d", { willReadFrequently: true });
      if (!context) {
        throw new Error("2D alpha scan context was unavailable");
      }
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(
        0,
        0,
        scratch.width,
        scratch.height,
      ).data;
      let left = scratch.width;
      let right = -1;
      let top = scratch.height;
      let bottom = -1;
      let pixelCount = 0;
      let alphaWeight = 0;
      let weightedY = 0;
      for (let y = 0; y < scratch.height; y += 1) {
        for (let x = 0; x < scratch.width; x += 1) {
          const alpha = pixels[(y * scratch.width + x) * 4 + 3]!;
          if (alpha <= 8) {
            continue;
          }
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
          pixelCount += 1;
          alphaWeight += alpha;
          weightedY += (y + 0.5) * alpha;
        }
      }
      if (pixelCount === 0) {
        throw new Error("Isolated cube capture had no visible alpha pixels");
      }
      const scaleX = captureBounds.width / scratch.width;
      const scaleY = captureBounds.height / scratch.height;
      const cssLeft = captureBounds.x + left * scaleX;
      const cssRight = captureBounds.x + (right + 1) * scaleX;
      const cssTop = captureBounds.y + top * scaleY;
      const cssBottom = captureBounds.y + (bottom + 1) * scaleY;
      const canvasMargins = {
        bottom: canvasBounds.y + canvasBounds.height - cssBottom,
        left: cssLeft - canvasBounds.x,
        right: canvasBounds.x + canvasBounds.width - cssRight,
        top: cssTop - canvasBounds.y,
      };
      const captureMargins = {
        bottom: captureBounds.y + captureBounds.height - cssBottom,
        left: cssLeft - captureBounds.x,
        right: captureBounds.x + captureBounds.width - cssRight,
        top: cssTop - captureBounds.y,
      };
      return {
        alphaCenterY:
          captureBounds.y + (weightedY / alphaWeight) * scaleY,
        bottom: cssBottom,
        canvasMargins,
        captureMargins,
        centerX: (cssLeft + cssRight) / 2,
        centerY: (cssTop + cssBottom) / 2,
        height: cssBottom - cssTop,
        left: cssLeft,
        pixelCount,
        right: cssRight,
        top: cssTop,
        touchesCanvasEdge: Object.values(canvasMargins).some(
          (margin) => margin <= 0.5,
        ),
        touchesCaptureEdge:
          left === 0 ||
          right === scratch.width - 1 ||
          top === 0 ||
          bottom === scratch.height - 1,
        width: cssRight - cssLeft,
      };
    },
    { canvasBounds: canvasBox, captureBounds: captureBox, png: pngBase64 },
  );
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
    type Snapshot = {
      bottom: number;
      key: string;
      left: number;
      right: number;
      top: number;
      transform: string;
    };
    type Probe = {
      flapAnimationNames: string[] | null;
      infiniteAnimationCounts: {
        midpoint: number | null;
        opening: number | null;
        ready: number | null;
      };
      reducedAnimations: Array<{
        duration: number;
        iterations: number;
        name: string;
        properties: string[];
      }> | null;
      reducedMidpoint: Snapshot[] | null;
      reducedOpening: Snapshot[] | null;
      records: Array<{ phase: string; time: number }>;
    };
    const testWindow = window as typeof window & {
      __cubo3dIntroProbe?: Probe;
    };
    const probe: Probe = {
      flapAnimationNames: null,
      infiniteAnimationCounts: {
        midpoint: null,
        opening: null,
        ready: null,
      },
      reducedAnimations: null,
      reducedMidpoint: null,
      reducedOpening: null,
      records: [],
    };
    testWindow.__cubo3dIntroProbe = probe;

    const infiniteAnimationCount = () =>
      document
        .getAnimations()
        .filter(
          (animation) => animation.effect?.getTiming().iterations === Infinity,
        ).length;
    const reducedSnapshot = (): Snapshot[] => {
      const selectors = [
        '[data-testid="package-intro"]',
        '[data-testid="package-backing"]',
        '[data-testid="package-backing-panel"]',
        '[data-testid="package-backing-surface"]',
        '[data-testid="package-intro-timeline"]',
        '[data-testid="package-ground-shadow"]',
        '[data-testid="package-shell"]',
        '[data-testid="package-origin"]',
        '[data-testid="package-inner-face"]',
        '[data-testid="package-aperture"]',
        '[data-testid="package-spine"]',
        '[data-testid="package-serial"]',
        '[data-testid="package-registration"]',
        '[data-testid="package-rail"]',
        '[data-testid="package-hinge"]',
        '[data-testid="package-intro-flap"]',
        '[data-testid="package-flap-face"]',
        '[data-testid="package-flap-edge"]',
        '[data-testid="package-seal"]',
        '[data-testid="package-seal-half"]',
        'main#cubo > aside',
        'main#cubo header',
        'main#cubo [class*="workspace"]',
        'main#cubo [class*="registrationMark"]',
        'main#cubo [class*="plotterLine"]',
        'main#cubo [class*="promise"]',
        'main#cubo [class*="scrambleButton"]',
        'main#cubo [class*="firstUseHint"]',
        '[data-testid="packaging-plan"]',
        'main#cubo [class*="telemetry"]',
        'main#cubo [class*="controlDock"]',
      ];
      const snapshots: Snapshot[] = [];
      for (const selector of selectors) {
        for (const [index, element] of Array.from(
          document.querySelectorAll<HTMLElement>(selector),
        ).entries()) {
          const rect = element.getBoundingClientRect();
          snapshots.push({
            bottom: rect.bottom,
            key: `${selector}:${index}`,
            left: rect.left,
            right: rect.right,
            top: rect.top,
            transform: getComputedStyle(element).transform,
          });
        }
      }
      for (const [selector, pseudo] of [
        ['[data-testid="package-shell"]', "::before"],
      ] as const) {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) {
          continue;
        }
        const rect = element.getBoundingClientRect();
        snapshots.push({
          bottom: rect.bottom,
          key: `${selector}${pseudo}`,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          transform: getComputedStyle(element, pseudo).transform,
        });
      }
      return snapshots;
    };

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
        requestAnimationFrame(() => {
          probe.reducedOpening = reducedSnapshot();
          probe.infiniteAnimationCounts.opening = infiniteAnimationCount();
          probe.reducedAnimations = document
            .getAnimations()
            .filter((animation) => {
              const effect = animation.effect as KeyframeEffect | null;
              return (
                animation.playState === "running" &&
                effect?.target instanceof Element &&
                effect.target.closest("main#cubo")
              );
            })
            .map((animation) => {
              const effect = animation.effect as KeyframeEffect;
              const properties = new Set<string>();
              for (const keyframe of effect.getKeyframes()) {
                for (const property of Object.keys(keyframe)) {
                  if (
                    ![
                      "composite",
                      "computedOffset",
                      "easing",
                      "offset",
                    ].includes(property)
                  ) {
                    properties.add(property);
                  }
                }
              }
              const timing = effect.getTiming();
              return {
                duration: Number(timing.duration),
                iterations: Number(timing.iterations),
                name:
                  animation instanceof CSSAnimation
                    ? animation.animationName
                    : "",
                properties: [...properties].sort(),
              };
            });
          window.setTimeout(() => {
            probe.reducedMidpoint = reducedSnapshot();
            probe.infiniteAnimationCounts.midpoint = infiniteAnimationCount();
          }, 80);
        });
      }
      if (phase === "ready") {
        probe.infiniteAnimationCounts.ready = infiniteAnimationCount();
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
          __cubo3dIntroProbe?: IntroPhaseProbe;
        }
      ).__cubo3dIntroProbe ?? {
        flapAnimationNames: null,
        infiniteAnimationCounts: {
          midpoint: null,
          opening: null,
          ready: null,
        },
        reducedAnimations: null,
        reducedMidpoint: null,
        reducedOpening: null,
        records: [],
      },
  );
}
