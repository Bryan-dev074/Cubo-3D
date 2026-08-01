import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import {
  boxesOverlap,
  ensureFaceControlsOpen,
  monitorBrowser,
  openExperience,
  setDeterministicBrowserState,
  sha256,
  waitForWebGLScene,
} from "@/tests/e2e/helpers";

const MOBILE_VIEWPORTS = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-320", width: 320, height: 568 },
] as const;
const VISUAL_ARTIFACT_DIRECTORY = resolve(
  process.cwd(),
  ".superpowers",
  "sdd",
);
const DESKTOP_COLLISION_VIEWPORTS = [
  { name: "desktop-1600", width: 1600, height: 1000 },
  { name: "desktop-1440", width: 1440, height: 900 },
] as const;
const GROUND_SHADOW_VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-320", width: 320, height: 568 },
] as const;
const CINEMATIC_VIEWPORTS = [
  { name: "desktop-1600", width: 1600, height: 1000 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-320", width: 320, height: 568 },
] as const;
const AMBIENT_VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-320", width: 320, height: 568 },
  { name: "mobile-landscape", width: 844, height: 390 },
] as const;

for (const viewport of DESKTOP_COLLISION_VIEWPORTS) {
  test(`${viewport.name} keeps all editorial regions collision-free`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      baseURL: "http://127.0.0.1:4173",
      colorScheme: "dark",
      reducedMotion: "reduce",
      viewport,
    });
    const page = await context.newPage();
    const diagnostics = monitorBrowser(page);
    await setDeterministicBrowserState(page);
    await openExperience(page);
    await waitForWebGLScene(page);

    const regions = {
      heading: page.getByRole("heading", { level: 1 }),
      hero: page.locator('[data-region="hero-copy"]'),
      stage: page.locator("#cube-stage"),
      canvas: page.locator(".cube-scene"),
      telemetry: page.getByTestId("live-telemetry"),
      dock: page.getByRole("region", { name: "Controles del cubo" }),
    } as const;
    const boxes = {
      heading: await requiredBox(regions.heading, "heading"),
      hero: await requiredBox(regions.hero, "hero"),
      stage: await requiredBox(regions.stage, "stage"),
      canvas: await requiredBox(regions.canvas, "canvas"),
      telemetry: await requiredBox(regions.telemetry, "telemetry"),
      dock: await requiredBox(regions.dock, "dock"),
    } as const;

    await expectPlotterTitleExactlyTwoLines(page, viewport);

    expect(boxesOverlap(boxes.heading, boxes.stage)).toBe(false);
    expect(boxesOverlap(boxes.hero, boxes.stage)).toBe(false);
    expect(boxesOverlap(boxes.heading, boxes.canvas)).toBe(false);
    expect(boxesOverlap(boxes.stage, boxes.telemetry)).toBe(false);
    expect(boxesOverlap(boxes.canvas, boxes.telemetry)).toBe(false);
    expect(boxesOverlap(boxes.dock, boxes.hero)).toBe(false);
    expect(boxesOverlap(boxes.dock, boxes.stage)).toBe(false);
    expect(boxesOverlap(boxes.dock, boxes.telemetry)).toBe(false);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBe(0);
    await diagnostics.assertClean();
    await context.close();
  });
}

for (const viewport of GROUND_SHADOW_VIEWPORTS) {
  test(`${viewport.name} keeps the fixed ground shadow contained and layered`, async ({
    browser,
  }) => {
    const mobile = viewport.width <= 390;
    const context = await browser.newContext({
      baseURL: "http://127.0.0.1:4173",
      colorScheme: "light",
      hasTouch: mobile,
      isMobile: mobile,
      reducedMotion: mobile ? "no-preference" : "reduce",
      viewport,
    });
    const page = await context.newPage();
    const diagnostics = monitorBrowser(page);
    await setDeterministicBrowserState(page);
    await openExperience(page);
    await waitForWebGLScene(page);

    await expectGroundShadowLayout(page);
    if (mobile) {
      await expectMobileInputEnvironment(page);
    }

    await diagnostics.assertClean();
    await context.close();
  });
}

for (const viewport of AMBIENT_VIEWPORTS) {
  test(`${viewport.name} keeps ambient DOM motion viewport-safe`, async ({
    browser,
  }) => {
    const mobile = viewport.width <= 900;
    const context = await browser.newContext({
      baseURL: "http://127.0.0.1:4173",
      hasTouch: mobile,
      isMobile: mobile,
      reducedMotion: "no-preference",
      viewport,
    });
    const page = await context.newPage();

    try {
      const diagnostics = monitorBrowser(page);
      await setDeterministicBrowserState(page);
      await openExperience(page);
      await waitForWebGLScene(page);

      const cubeFrame = page.getByTestId("cube-frame");
      await expect(cubeFrame).toHaveCSS(
        "animation-name",
        mobile ? /cube-microfloat-mobile$/ : /cube-microfloat$/,
      );
      await expect(page.getByTestId("telemetry-summary-rail")).toHaveCSS(
        "display",
        mobile ? "block" : "none",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        ),
      ).toBe(0);
      if (mobile) {
        await expectMobileInputEnvironment(page);
      }
      await mkdir(VISUAL_ARTIFACT_DIRECTORY, { recursive: true });
      await page.screenshot({
        path: resolve(
          VISUAL_ARTIFACT_DIRECTORY,
          `task-4-${viewport.name}-ambient.png`,
        ),
      });
      if (viewport.name === "desktop") {
        await captureTask5MotionStates(page, cubeFrame);
      }
      await diagnostics.assertClean();
    } finally {
      await releaseAndCloseWebGLContext(page, context);
    }
  });
}

test("mobile sustains at most one high contrast ambient pulse across later coincidences", async ({
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

  try {
    await setDeterministicBrowserState(page);
    await openExperience(page);
    await waitForWebGLScene(page);

    const forcedTimes = [
      46_530,
      53_210,
      79_870,
      118_370,
      167_830,
      ...Array.from({ length: 320 }, (_, index) => index * 540),
    ].filter((elapsedMs, index, all) => all.indexOf(elapsedMs) === index);
    expect(forcedTimes).toEqual(
      expect.arrayContaining([46_530, 53_210, 79_870, 118_370, 167_830]),
    );
    expect(forcedTimes.length).toBe(325);
    const samples = await page.evaluate(async (sweepTimes) => {
      const animations = document
        .getAnimations()
        .filter(
          (animation) => animation.effect?.getTiming().iterations === Infinity,
        );
      const samples = [];

      for (const forcedTime of sweepTimes) {
        for (const animation of animations) {
            if (animation.effect?.getTiming().iterations !== Infinity) {
              continue;
            }
            animation.pause();
            animation.currentTime = forcedTime;
          }
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve()),
          );

          const opacity = (selector: string, pseudo?: string) => {
            const element = document.querySelector<HTMLElement>(selector);
            if (!element) {
              throw new Error(`Missing ambient probe: ${selector}`);
            }
            return Number.parseFloat(getComputedStyle(element, pseudo).opacity);
          };
          const maxOpacity = (selector: string) => {
            const elements = document.querySelectorAll<HTMLElement>(selector);
            if (elements.length === 0) {
              throw new Error(`Missing ambient probes: ${selector}`);
            }
            return Math.max(
              ...Array.from(elements, (element) =>
                Number.parseFloat(getComputedStyle(element).opacity),
              ),
            );
          };

          samples.push({
            elapsedMs: forcedTime,
            dock: opacity('section[class*="controlDock"]', "::before"),
            hero: opacity('[class*="heroRule"]', "::after"),
            matrix: opacity('ul[class*="pieceMatrix"]', "::after"),
            plotterGlyph: maxOpacity('[class*="plotterGlyph"]'),
            plotterRegister: maxOpacity('[class*="plotterRegister"]'),
            purchase: opacity('a[class*="purchaseButton"]', "::after"),
            summary: opacity('[data-testid="telemetry-summary-rail"]'),
          });
        }

        return samples;
      }, forcedTimes);

    const knownCollision = samples.find(
      (sample) => sample.elapsedMs === 46_530,
    );
    expect(knownCollision).toBeDefined();
    expect(knownCollision!.dock).toBeGreaterThan(0);
    expect(knownCollision!.plotterGlyph).toBeGreaterThan(0.2);
    expect(
      [
        knownCollision!.dock,
        knownCollision!.hero,
        knownCollision!.matrix,
        Math.max(
          knownCollision!.plotterGlyph,
          knownCollision!.plotterRegister,
        ),
        knownCollision!.purchase,
        knownCollision!.summary,
      ].filter((opacity) => opacity > 0.2),
    ).toHaveLength(1);
    expect(samples.some((sample) => sample.dock > 0)).toBe(true);
    expect(samples.some((sample) => sample.plotterGlyph > 0.2)).toBe(true);
    expect(samples.some((sample) => sample.plotterRegister > 0.2)).toBe(true);
    for (const sample of samples) {
      const plotter = Math.max(
        sample.plotterGlyph,
        sample.plotterRegister,
      );
      const highContrastCues = {
        dock: sample.dock,
        hero: sample.hero,
        matrix: sample.matrix,
        plotter,
        purchase: sample.purchase,
        summary: sample.summary,
      };
      expect(
        Object.values(highContrastCues).filter((opacity) => opacity > 0.2)
          .length,
        `High-contrast collision at ${sample.elapsedMs}ms: ${JSON.stringify(highContrastCues)}`,
      ).toBeLessThanOrEqual(1);
      for (const secondary of [
        sample.dock,
        sample.hero,
        sample.matrix,
        sample.purchase,
        sample.summary,
      ]) {
        expect(secondary).toBeLessThanOrEqual(0.12);
      }
    }
  } finally {
    await releaseAndCloseWebGLContext(page, context);
  }
});

test("the plotter fallback remains legible while it is the only visible title layer", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    reducedMotion: "no-preference",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    const diagnostics = monitorBrowser(page);
    await setDeterministicBrowserState(page);
    await openExperience(page);

    const fallback = await page.evaluate(() => {
      const base = document.querySelector<HTMLElement>(
        '[data-testid="plotter-base"]',
      );
      if (!base) {
        throw new Error("Plotter fallback layer was unavailable");
      }

      for (const ink of document.querySelectorAll<HTMLElement>(
        '[data-testid="plotter-glyph"], [data-testid="plotter-register"]',
      )) {
        ink.style.animation = "none";
        ink.style.opacity = "0";
      }

      const readColor = (value: string) => {
        const channels = value.match(/[\d.]+/g)?.map(Number) ?? [];
        if (channels.length < 3) {
          throw new Error(`Unsupported computed color: ${value}`);
        }
        return {
          alpha: channels[3] ?? 1,
          blue: channels[2]!,
          green: channels[1]!,
          red: channels[0]!,
        };
      };
      const foreground = readColor(getComputedStyle(base).color);
      let layerOpacity = foreground.alpha;
      let backgroundElement: HTMLElement | null = base;
      while (backgroundElement) {
        layerOpacity *= Number(getComputedStyle(backgroundElement).opacity);
        const candidate = readColor(
          getComputedStyle(backgroundElement).backgroundColor,
        );
        if (candidate.alpha >= 0.999) {
          break;
        }
        backgroundElement = backgroundElement.parentElement;
      }
      if (!backgroundElement) {
        throw new Error("Plotter fallback had no opaque background");
      }
      const background = readColor(
        getComputedStyle(backgroundElement).backgroundColor,
      );
      const composite = {
        red: foreground.red * layerOpacity + background.red * (1 - layerOpacity),
        green:
          foreground.green * layerOpacity +
          background.green * (1 - layerOpacity),
        blue:
          foreground.blue * layerOpacity +
          background.blue * (1 - layerOpacity),
      };
      const linear = (channel: number) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      };
      const luminance = (color: {
        readonly blue: number;
        readonly green: number;
        readonly red: number;
      }) =>
        0.2126 * linear(color.red) +
        0.7152 * linear(color.green) +
        0.0722 * linear(color.blue);
      const foregroundLuminance = luminance(composite);
      const backgroundLuminance = luminance(background);
      const contrast =
        (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
        (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
      const visibleInkOpacity = Math.max(
        ...Array.from(
          document.querySelectorAll<HTMLElement>(
            '[data-testid="plotter-glyph"], [data-testid="plotter-register"]',
          ),
          (element) => Number(getComputedStyle(element).opacity),
        ),
      );

      return { contrast, layerOpacity, visibleInkOpacity };
    });

    expect(fallback.visibleInkOpacity).toBe(0);
    expect(fallback.layerOpacity).toBeGreaterThan(0);
    expect(fallback.contrast).toBeGreaterThanOrEqual(3);
    await diagnostics.assertClean();
  } finally {
    await releaseAndCloseWebGLContext(page, context);
  }
});

test("reduced motion leaves the plotter solid and disables every ambient name", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    await setDeterministicBrowserState(page);
    await openExperience(page);
    await waitForWebGLScene(page);

    await expect(page.getByTestId("plotter-glyph").first()).toHaveCSS(
      "animation-name",
      "none",
    );
    await expect(page.getByTestId("plotter-base").first()).toHaveCSS(
      "opacity",
      "0",
    );
    await expect(page.getByTestId("cube-frame")).toHaveCSS(
      "animation-name",
      "none",
    );
    const runningInfiniteAnimations = await page.evaluate(() =>
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation.effect?.getTiming().iterations === Infinity &&
            animation.playState === "running",
        )
        .map((animation) => {
          const effect = animation.effect as KeyframeEffect;
          const target = effect.target;
          return {
            animationName:
              animation instanceof CSSAnimation ? animation.animationName : "",
            target:
              target instanceof Element
                ? target.getAttribute("data-testid") ??
                  Array.from(target.classList).join(".") ??
                  target.tagName
                : "unknown",
          };
        }),
    );
    expect(
      runningInfiniteAnimations,
      `Reduced motion left infinite ambient animations running: ${JSON.stringify(runningInfiniteAnimations)}`,
    ).toEqual([]);
  } finally {
    await releaseAndCloseWebGLContext(page, context);
  }
});

test("closes its browser context when WebGL release cannot inspect the page", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
  });
  const page = await context.newPage();
  let contextClosed = false;
  context.on("close", () => {
    contextClosed = true;
  });
  await page.close();

  await expect(releaseAndCloseWebGLContext(page, context)).rejects.toThrow();
  expect(contextClosed).toBe(true);
});

test("mobile-390 keeps the fixed ground shadow unchanged during a real orbit", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    colorScheme: "light",
    hasTouch: true,
    isMobile: true,
    reducedMotion: "no-preference",
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const diagnostics = monitorBrowser(page);
  await setDeterministicBrowserState(page);
  await openExperience(page);
  const canvas = await waitForWebGLScene(page);
  await expect(canvas).toHaveAttribute("data-engine", /three\.js/i);
  await expectGroundShadowLayout(page);
  await expectMobileInputEnvironment(page);

  const shadow = page.getByTestId("cube-ground-shadow");
  const before = await shadow.boundingBox();
  const beforeStyle = await readGroundShadowStyle(shadow);
  await movePointerOutsideCanvas(page);
  const beforeCanvas = sha256(await canvas.screenshot());

  await rightDragCanvas(page, canvas);
  await movePointerOutsideCanvas(page);

  expect(sha256(await canvas.screenshot())).not.toBe(beforeCanvas);
  expect(await shadow.boundingBox()).toEqual(before);
  expect(await readGroundShadowStyle(shadow)).toEqual(beforeStyle);

  await diagnostics.assertClean();
  await context.close();
});

test("desktop preserves the approved editorial shell proportions in dark system mode", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    colorScheme: "dark",
    reducedMotion: "reduce",
    viewport: { width: 1600, height: 1000 },
  });
  const page = await context.newPage();
  const diagnostics = monitorBrowser(page);
  await setDeterministicBrowserState(page);
  await openExperience(page);
  await waitForWebGLScene(page);

  const spineBox = await page.locator("main > aside").first().boundingBox();
  const headerBox = await page.locator("main header").boundingBox();
  const heading = page.getByRole("heading", { level: 1 });
  const headingFontSize = await heading.evaluate((element) =>
    Number.parseFloat(window.getComputedStyle(element).fontSize),
  );
  const surfaceColor = await page.locator("main").evaluate(
    (element) => window.getComputedStyle(element).backgroundColor,
  );

  expect(spineBox).not.toBeNull();
  expect(spineBox!.width).toBeGreaterThanOrEqual(150);
  expect(spineBox!.width).toBeLessThanOrEqual(155);
  expect(headerBox).not.toBeNull();
  expect(headerBox!.height).toBeGreaterThanOrEqual(94);
  expect(headerBox!.height).toBeLessThanOrEqual(98);
  expect(headingFontSize).toBeGreaterThanOrEqual(80);
  expect(headingFontSize).toBeLessThanOrEqual(96);
  expect(surfaceColor).toBe("rgb(248, 248, 247)");
  await expect(page.getByRole("link", { name: "CUBO 3D" })).toBeVisible();
  await diagnostics.assertClean();
  await context.close();
});

test("tablet keeps the technical column inside the viewport", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    colorScheme: "light",
    reducedMotion: "reduce",
    viewport: { width: 768, height: 1024 },
  });
  const page = await context.newPage();
  const diagnostics = monitorBrowser(page);
  await setDeterministicBrowserState(page);
  await openExperience(page);
  await waitForWebGLScene(page);

  const telemetry = page.getByTestId("live-telemetry");
  const box = await telemetry.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(768);
  await expect(
    page.locator('details[data-mobile-expandable="true"]'),
  ).not.toHaveAttribute("open", "");
  await diagnostics.assertClean();
  await context.close();
});

test("wide coarse touch keeps the utility dock operable", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    colorScheme: "light",
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
    viewport: { width: 1024, height: 768 },
  });
  const page = await context.newPage();
  const diagnostics = monitorBrowser(page);
  await setDeterministicBrowserState(page);
  await openExperience(page);
  await waitForWebGLScene(page);

  expect(
    await page.evaluate(
      () =>
        window.matchMedia("(hover: none)").matches ||
        window.matchMedia("(pointer: coarse)").matches,
    ),
  ).toBe(true);

  await page
    .getByRole("button", { name: "Más controles" })
    .tap({ timeout: 5_000 });
  const closeUtilities = page.getByRole("button", {
    name: "Cerrar controles adicionales",
  });
  await expect(closeUtilities).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("button", { name: "Deshacer" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mostrar controles por capa" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Mostrar controles por capa" })
    .tap();
  await expect(
    page.getByRole("group", { name: "Giros por capa" }),
  ).toBeVisible();

  await closeUtilities.tap();
  await expect(
    page.getByRole("button", { name: "Más controles" }),
  ).toHaveAttribute("aria-expanded", "false");

  await diagnostics.assertClean();
  await context.close();
});

test("mobile landscape keeps each primary interaction region viewport-safe", async ({
  browser,
}) => {
  const viewport = { width: 844, height: 390 } as const;
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    colorScheme: "light",
    hasTouch: true,
    isMobile: true,
    reducedMotion: "no-preference",
    viewport,
  });
  const page = await context.newPage();
  const diagnostics = monitorBrowser(page);
  await setDeterministicBrowserState(page);
  await openExperience(page);
  await waitForWebGLScene(page);
  await expectMobileInputEnvironment(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBe(0);
  await expectPlotterTitleExactlyTwoLines(page, viewport);
  await expectCubeSeparatedFromDockAndTelemetry(page);
  await expectVisibleTargetsAtLeast44(page);

  const purchaseCta = page
    .getByRole("link", { name: "Comprar cubo" })
    .first();
  const scrambleCta = page.getByRole("button", {
    name: "Desordenar cubo",
  });
  const cubeScene = page.locator(".cube-scene");
  const controlDock = page.getByRole("region", {
    name: "Controles del cubo",
  });
  const simultaneous = {
    controlDock: await requiredBox(controlDock, "control dock"),
    cubeScene: await requiredBox(cubeScene, "cube scene"),
    purchaseCta: await requiredBox(purchaseCta, "purchase CTA"),
    scrambleCta: await requiredBox(scrambleCta, "scramble CTA"),
  };
  expect(boxesOverlap(simultaneous.controlDock, simultaneous.purchaseCta)).toBe(
    false,
  );
  expect(boxesOverlap(simultaneous.controlDock, simultaneous.scrambleCta)).toBe(
    false,
  );
  expect(boxesOverlap(simultaneous.controlDock, simultaneous.cubeScene)).toBe(
    false,
  );

  const regions = [
    [purchaseCta, "purchase CTA"],
    [scrambleCta, "scramble CTA"],
    [cubeScene, "cube scene"],
    [controlDock, "control dock"],
  ] as const;
  for (const [region, label] of regions) {
    await region.evaluate((element) =>
      element.scrollIntoView({ block: "nearest", inline: "nearest" }),
    );
    const box = await requiredBox(region, label);
    expect(box.x, `${label} left edge`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `${label} right edge`).toBeLessThanOrEqual(
      viewport.width + 1,
    );
    expect(box.y, `${label} top edge`).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height, `${label} bottom edge`).toBeLessThanOrEqual(
      viewport.height + 1,
    );
  }

  await diagnostics.assertClean();
  await context.close();
});

for (const viewport of MOBILE_VIEWPORTS) {
  test(`${viewport.name} keeps the hero, cube entry, touch targets and safe areas intact`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      baseURL: "http://127.0.0.1:4173",
      colorScheme: "light",
      hasTouch: true,
      isMobile: true,
      reducedMotion: "no-preference",
      viewport,
    });
    const page = await context.newPage();
    const diagnostics = monitorBrowser(page);
    await setDeterministicBrowserState(page);
    await openExperience(page);
    await waitForWebGLScene(page);
    await expectMobileInputEnvironment(page);

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBe(0);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expectPlotterTitleExactlyTwoLines(page, viewport);
    await expectCubeSeparatedFromDockAndTelemetry(page);

    const heroElements = [
      page.getByRole("heading", { level: 1 }),
      page.getByText(
        "Un clásico reinventado en 3D. Girá, desafiá tu mente y volvé a ordenar los colores.",
      ),
      page.getByRole("button", { name: "Desordenar cubo" }),
      page.getByText("Con el dedo: pieza = capa · fondo = rotar"),
    ];
    for (const element of heroElements) {
      const box = await element.boundingBox();
      expect(
        box,
        `missing box for ${await element.getAttribute("id")}`,
      ).not.toBeNull();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
    }

    const stageBox = await page.locator("#cube-stage").boundingBox();
    expect(stageBox).not.toBeNull();
    expect(stageBox!.y).toBeLessThan(viewport.height);
    expect(stageBox!.height).toBeGreaterThanOrEqual(viewport.height * 0.42);

    if (viewport.width === 320) {
      const wordmark = page.getByRole("link", { name: "CUBO 3D" });
      const language = page.getByRole("group", { name: "Idioma" });
      const purchase = page
        .getByRole("link", { name: "Comprar cubo" })
        .first();
      const wordmarkBox = await requiredBox(wordmark, "mobile wordmark");
      const languageBox = await requiredBox(language, "mobile language switch");
      const purchaseBox = await requiredBox(purchase, "mobile purchase");

      await expect(wordmark).toBeVisible();
      expect(boxesOverlap(wordmarkBox, languageBox)).toBe(false);
      expect(boxesOverlap(wordmarkBox, purchaseBox)).toBe(false);
      expect(boxesOverlap(languageBox, purchaseBox)).toBe(false);
    }

    await expectVisibleTargetsAtLeast44(page);
    await expectSafePurchaseClear(page);

    const details = page.locator('details[data-mobile-expandable="true"]');
    await expect(details).not.toHaveAttribute("open", "");
    await ensureFaceControlsOpen(page);
    await page.getByText("Ver telemetría completa").click();
    await expect(details).toHaveAttribute("open", "");
    await expectVisibleTargetsAtLeast44(page);
    await expectSafePurchaseClear(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBe(0);
    await page.getByRole("button", { name: "PT" }).click();
    await expect(details).toHaveAttribute("open", "");

    await diagnostics.assertClean();
    await context.close();
  });
}

async function requiredBox(
  locator: Locator,
  label: string,
) {
  const box = await locator.boundingBox();
  expect(box, `${label} must have a rendered box`).not.toBeNull();
  return box!;
}

async function captureTask5MotionStates(
  page: Page,
  cubeFrame: Locator,
): Promise<void> {
  const samplePlotterAt = (cyclePhase: number) => page.evaluate(async (phase) => {
    const requireCssAnimation = (
      element: HTMLElement,
      nameSuffix: string,
    ) => {
      const animation = element
        .getAnimations()
        .find(
          (candidate): candidate is CSSAnimation =>
            candidate instanceof CSSAnimation &&
            candidate.animationName.endsWith(nameSuffix),
        );
      if (!animation) {
        throw new Error(
          `Missing ${nameSuffix} animation on ${element.className}`,
        );
      }
      return animation;
    };
    const glyphs = Array.from(
      document.querySelectorAll<HTMLElement>('[data-testid="plotter-glyph"]'),
    );
    const registers = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-testid="plotter-register"]',
      ),
    );
    if (glyphs.length === 0) {
      throw new Error("Plotter glyphs were unavailable for capture");
    }
    if (registers.length !== 1) {
      throw new Error(`Expected one plotter register, found ${registers.length}`);
    }
    for (const glyph of glyphs) {
      const animation = requireCssAnimation(glyph, "plotter-glyph-cycle");
      const delay = Number(animation.effect?.getTiming().delay ?? 0);
      animation.pause();
      animation.currentTime = phase + delay;
    }
    for (const register of registers) {
      const animation = requireCssAnimation(
        register,
        "plotter-register-cycle",
      );
      const delay = Number(animation.effect?.getTiming().delay ?? 0);
      animation.pause();
      animation.currentTime = phase + delay;
    }
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    return {
      glyphOpacities: glyphs.map((glyph) =>
        Number(getComputedStyle(glyph).opacity),
      ),
      registerOpacities: registers.map((register) =>
        Number(getComputedStyle(register).opacity),
      ),
      timings: glyphs.map((glyph) => ({
        eraseEnd: Number(glyph.dataset.eraseEnd),
        eraseStart: Number(glyph.dataset.eraseStart),
        writeEnd: Number(glyph.dataset.writeEnd),
        writeStart: Number(glyph.dataset.writeStart),
      })),
    };
  }, cyclePhase);

  const expectDescendingInk = (
    opacities: readonly number[],
    label: string,
  ) => {
    for (let index = 1; index < opacities.length; index += 1) {
      expect(
        opacities[index]!,
        `${label}: glyph ${index} must not precede glyph ${index - 1}: ${JSON.stringify(opacities)}`,
      ).toBeLessThanOrEqual(opacities[index - 1]! + 0.02);
    }
  };

  const titleFrame = await samplePlotterAt(420);
  expect(
    titleFrame.glyphOpacities.some(
      (opacity) => opacity > 0.05 && opacity < 0.95,
    ),
    `Expected a partial-ink plotter frame, received ${JSON.stringify(titleFrame)}`,
  ).toBe(true);
  expect(
    titleFrame.glyphOpacities.some((opacity) => opacity >= 0.95),
    `Expected already-written solid glyphs, received ${JSON.stringify(titleFrame)}`,
  ).toBe(true);
  expect(
    titleFrame.glyphOpacities.some((opacity) => opacity <= 0.05),
    `Expected base-only pending glyphs, received ${JSON.stringify(titleFrame)}`,
  ).toBe(true);
  expect(
    titleFrame.registerOpacities.filter((opacity) => opacity > 0.2),
    `Only the register for the actively written line may be visible: ${JSON.stringify(titleFrame)}`,
  ).toHaveLength(1);
  expectDescendingInk(titleFrame.glyphOpacities, "forward plotter write");
  expect(titleFrame.timings.at(-1)?.writeEnd).toBe(760);
  expect(titleFrame.timings[0]?.eraseEnd).toBe(10_160);
  expect(
    titleFrame.timings.every(
      ({ eraseStart, writeEnd }) => eraseStart - writeEnd > 10_800 * 0.8,
    ),
    `Every glyph must remain solid for more than 80% of the cycle: ${JSON.stringify(titleFrame.timings)}`,
  ).toBe(true);
  await page.screenshot({
    path: resolve(VISUAL_ARTIFACT_DIRECTORY, "task-5-title-mid-write.png"),
  });

  const fullyWritten = await samplePlotterAt(760);
  expect(fullyWritten.glyphOpacities.every((opacity) => opacity >= 0.98)).toBe(
    true,
  );
  expect(fullyWritten.registerOpacities[0]).toBeLessThanOrEqual(0.05);

  const heldSolid = await samplePlotterAt(9_000);
  expect(heldSolid.glyphOpacities.every((opacity) => opacity >= 0.98)).toBe(
    true,
  );

  const reverseErase = await samplePlotterAt(9_920);
  expect(reverseErase.glyphOpacities[0]).toBeGreaterThanOrEqual(0.98);
  expect(reverseErase.glyphOpacities.at(-1)).toBeLessThanOrEqual(0.02);
  expectDescendingInk(reverseErase.glyphOpacities, "reverse plotter erase");

  const baseOnly = await samplePlotterAt(10_400);
  expect(baseOnly.glyphOpacities.every((opacity) => opacity <= 0.02)).toBe(
    true,
  );
  expect(baseOnly.registerOpacities[0]).toBeLessThanOrEqual(0.05);

  await expect(cubeFrame).toHaveCSS("animation-name", /cube-microfloat$/);
  await expect(cubeFrame).toHaveCSS("animation-play-state", "running");
  await page.evaluate(() => {
    for (const titlePart of document.querySelectorAll<HTMLElement>(
      '[data-testid="plotter-glyph"], [data-testid="plotter-register"]',
    )) {
      for (const animation of titlePart.getAnimations()) {
        animation.currentTime = 0;
        animation.play();
      }
    }
    const frame = document.querySelector<HTMLElement>(
      '[data-testid="cube-frame"]',
    );
    const animation = frame?.getAnimations().find(
      (candidate): candidate is CSSAnimation =>
        candidate instanceof CSSAnimation &&
        candidate.animationName.endsWith("cube-microfloat"),
    );
    if (!animation) {
      throw new Error("Cube microfloat animation was unavailable");
    }
    animation.currentTime = 0;
  });

  await page.locator("#cube-stage").hover();
  await expect(cubeFrame).toHaveCSS("animation-play-state", "paused");
  const pausedTransform = await cubeFrame.evaluate(
    (element) => getComputedStyle(element).transform,
  );
  expect(pausedTransform).not.toBe("none");
  await page.waitForTimeout(240);
  await expect(cubeFrame).toHaveCSS("transform", pausedTransform);
  await page.screenshot({
    path: resolve(
      VISUAL_ARTIFACT_DIRECTORY,
      "task-5-hover-paused-microfloat.png",
    ),
  });
  await page.mouse.move(0, 0);
  await waitForAnimationFrames(page, 2);
  await expect(cubeFrame).toHaveCSS("animation-play-state", "running");
}

async function expectPlotterTitleExactlyTwoLines(
  page: Page,
  viewport: { readonly width: number; readonly height: number },
): Promise<void> {
  const title = page.getByTestId("plotter-title");
  const lines = title.getByTestId("plotter-line");
  await expect(title).toBeVisible();
  await expect(lines).toHaveCount(2);

  const layout = await title.evaluate((heading) => {
    const toRect = (rect: DOMRect) => ({
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      top: rect.top,
    });
    const headingRect = heading.getBoundingClientRect();
    const headingStyle = getComputedStyle(heading);
    const renderedLines = Array.from(
      heading.querySelectorAll<HTMLElement>('[data-testid="plotter-line"]'),
      (line) => {
        const base = line.querySelector<HTMLElement>(
          '[data-testid="plotter-base"]',
        );
        if (!base) {
          throw new Error("Plotter line is missing its stable text base");
        }
        const textRange = document.createRange();
        textRange.selectNodeContents(base);
        const lineStyle = getComputedStyle(line);
        return {
          box: toRect(line.getBoundingClientRect()),
          overflowX: lineStyle.overflowX,
          overflowY: lineStyle.overflowY,
          text: base.textContent?.trim() ?? "",
          textRects: Array.from(textRange.getClientRects(), toRect).filter(
            (rect) => rect.right > rect.left && rect.bottom > rect.top,
          ),
        };
      },
    );
    return {
      heading: toRect(headingRect),
      headingOverflowX: headingStyle.overflowX,
      headingOverflowY: headingStyle.overflowY,
      lines: renderedLines,
    };
  });

  expect(layout.lines).toHaveLength(2);
  expect(layout.lines.every((line) => line.text.length > 0)).toBe(true);
  expect(layout.lines[1]!.box.top).toBeGreaterThan(layout.lines[0]!.box.top);

  const tolerance = 1;
  expect(layout.heading.left).toBeGreaterThanOrEqual(-tolerance);
  expect(layout.heading.top).toBeGreaterThanOrEqual(-tolerance);
  expect(layout.heading.right).toBeLessThanOrEqual(viewport.width + tolerance);
  expect(layout.heading.bottom).toBeLessThanOrEqual(
    viewport.height + tolerance,
  );
  expect([layout.headingOverflowX, layout.headingOverflowY]).not.toContain(
    "hidden",
  );
  expect([layout.headingOverflowX, layout.headingOverflowY]).not.toContain(
    "clip",
  );
  for (const [index, line] of layout.lines.entries()) {
    expect(
      line.textRects,
      `Plotter line ${index + 1} wrapped into additional visual lines`,
    ).toHaveLength(1);
    expect([line.overflowX, line.overflowY]).not.toContain("hidden");
    expect([line.overflowX, line.overflowY]).not.toContain("clip");
    expect(
      line.box.left,
      `plotter line ${index + 1} left edge`,
    ).toBeGreaterThanOrEqual(layout.heading.left - tolerance);
    expect(
      line.box.top,
      `plotter line ${index + 1} top edge`,
    ).toBeGreaterThanOrEqual(layout.heading.top - tolerance);
    expect(
      line.box.right,
      `plotter line ${index + 1} right edge`,
    ).toBeLessThanOrEqual(layout.heading.right + tolerance);
    expect(
      line.box.bottom,
      `plotter line ${index + 1} bottom edge`,
    ).toBeLessThanOrEqual(layout.heading.bottom + tolerance);
    for (const rect of line.textRects) {
      expect(rect.left, `plotter line ${index + 1} viewport left`).toBeGreaterThanOrEqual(
        -tolerance,
      );
      expect(rect.top, `plotter line ${index + 1} viewport top`).toBeGreaterThanOrEqual(
        -tolerance,
      );
      expect(rect.right, `plotter line ${index + 1} viewport right`).toBeLessThanOrEqual(
        viewport.width + tolerance,
      );
      expect(rect.bottom, `plotter line ${index + 1} viewport bottom`).toBeLessThanOrEqual(
        viewport.height + tolerance,
      );
    }
  }
}

async function expectCubeSeparatedFromDockAndTelemetry(
  page: Page,
): Promise<void> {
  const regions = {
    cubeFrame: await requiredBox(page.getByTestId("cube-frame"), "cube frame"),
    cubeScene: await requiredBox(page.locator(".cube-scene"), "cube scene"),
    dock: await requiredBox(
      page.getByRole("region", { name: "Controles del cubo" }),
      "control dock",
    ),
    telemetry: await requiredBox(
      page.getByTestId("live-telemetry"),
      "live telemetry",
    ),
  } as const;

  for (const cubeRegion of ["cubeFrame", "cubeScene"] as const) {
    for (const interfaceRegion of ["dock", "telemetry"] as const) {
      expect(
        boxesOverlap(regions[cubeRegion], regions[interfaceRegion]),
        `${cubeRegion} must remain separate from ${interfaceRegion}`,
      ).toBe(false);
    }
  }
}

async function expectGroundShadowLayout(page: Page): Promise<void> {
  const stage = page.locator("#cube-stage");
  const shadow = page.getByTestId("cube-ground-shadow");
  await expect(shadow).toHaveCount(1);

  const [stageBox, shadowBox, styles] = await Promise.all([
    stage.boundingBox(),
    shadow.boundingBox(),
    readGroundShadowStyle(shadow),
  ]);
  expect(stageBox).not.toBeNull();
  expect(shadowBox).not.toBeNull();

  const edgeTolerance = 32;
  expect(shadowBox!.x).toBeGreaterThanOrEqual(stageBox!.x - edgeTolerance);
  expect(shadowBox!.y).toBeGreaterThanOrEqual(stageBox!.y - edgeTolerance);
  expect(shadowBox!.x + shadowBox!.width).toBeLessThanOrEqual(
    stageBox!.x + stageBox!.width + edgeTolerance,
  );
  expect(shadowBox!.y + shadowBox!.height).toBeLessThanOrEqual(
    stageBox!.y + stageBox!.height + edgeTolerance,
  );
  expect(shadowBox!.width).toBeGreaterThan(stageBox!.width * 0.35);
  expect(shadowBox!.width).toBeLessThanOrEqual(stageBox!.width + edgeTolerance);
  expect(shadowBox!.height).toBeGreaterThan(30);
  const centerX =
    (shadowBox!.x - stageBox!.x + shadowBox!.width / 2) / stageBox!.width;
  const centerY =
    (shadowBox!.y - stageBox!.y + shadowBox!.height / 2) / stageBox!.height;
  expect(centerX).toBeGreaterThanOrEqual(0.45);
  expect(centerX).toBeLessThanOrEqual(0.62);
  expect(centerY).toBeGreaterThanOrEqual(0.6);
  expect(centerY).toBeLessThanOrEqual(0.74);

  expect(styles).toMatchObject({
    opacity: "1",
    pointerEvents: "none",
    position: "absolute",
    zIndex: "1",
  });
  expect(styles.backgroundImage).toContain("radial-gradient");
  expect(styles.transform).not.toBe("none");
}

async function readGroundShadowStyle(shadow: Locator) {
  return shadow.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      backgroundImage: styles.backgroundImage,
      opacity: styles.opacity,
      pointerEvents: styles.pointerEvents,
      position: styles.position,
      transform: styles.transform,
      zIndex: styles.zIndex,
    };
  });
}

async function rightDragCanvas(page: Page, canvas: Locator): Promise<void> {
  const box = await requiredBox(canvas, "WebGL canvas");
  const startX = box.x + box.width * 0.15;
  const startY = box.y + box.height * 0.5;

  await page.mouse.move(startX, startY);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(startX + 96, startY - 22, { steps: 8 });
  await page.mouse.up({ button: "right" });
}

async function waitForAnimationFrames(page: Page, count: number): Promise<void> {
  await page.evaluate(async (frameCount) => {
    for (let frame = 0; frame < frameCount; frame += 1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  }, count);
}

async function movePointerOutsideCanvas(page: Page): Promise<void> {
  await page.mouse.move(0, 0);
  await waitForAnimationFrames(page, 2);
}

async function expectVisibleTargetsAtLeast44(page: Page): Promise<void> {
  const targets = page.locator("main button, main a, main summary");
  let measured = 0;
  for (let index = 0; index < (await targets.count()); index += 1) {
    const target = targets.nth(index);
    if (!(await target.isVisible())) {
      continue;
    }
    measured += 1;
    const box = await target.boundingBox();
    expect(box).not.toBeNull();
    const targetName =
      (await target.getAttribute("aria-label")) ??
      (await target.textContent()) ??
      "unlabeled target";
    expect(box!.width, targetName.trim()).toBeGreaterThanOrEqual(44);
    expect(box!.height, targetName.trim()).toBeGreaterThanOrEqual(44);
  }
  expect(measured).toBeGreaterThan(0);
}

async function expectSafePurchaseClear(page: Page): Promise<void> {
  const controlBox = await page
    .getByRole("region", { name: "Controles del cubo" })
    .boundingBox();
  const summaryBox = await page
    .getByRole("group", { name: "Resumen de telemetría" })
    .boundingBox();
  const safePurchaseBox = await page
    .getByRole("link", { name: "Comprar cubo" })
    .last()
    .boundingBox();
  expect(controlBox).not.toBeNull();
  expect(summaryBox).not.toBeNull();
  expect(safePurchaseBox).not.toBeNull();
  expect(boxesOverlap(safePurchaseBox!, controlBox!)).toBe(false);
  expect(boxesOverlap(safePurchaseBox!, summaryBox!)).toBe(false);
}

const SCREENSHOT_VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-320", width: 320, height: 568 },
] as const;

for (const colorScheme of ["light", "dark"] as const) {
  for (const viewport of SCREENSHOT_VIEWPORTS) {
    test(`captures ${viewport.name} ${colorScheme} from the fixed solved scene`, async ({
      browser,
    }) => {
      const { context, page } = await createVisualPage(
        browser,
        viewport,
        colorScheme,
      );
      const diagnostics = monitorBrowser(page);
      await setDeterministicBrowserState(page);
      await openExperience(page);
      await waitForWebGLScene(page);
      await page.waitForTimeout(180);
      if (viewport.width <= 390) {
        await expectMobileInputEnvironment(page);
      }

      await mkdir(VISUAL_ARTIFACT_DIRECTORY, { recursive: true });
      await page.screenshot({
        animations: "disabled",
        path: resolve(
          VISUAL_ARTIFACT_DIRECTORY,
          `task-2-${viewport.name}-${colorScheme}.png`,
        ),
      });

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        ),
      ).toBe(0);
      await diagnostics.assertClean();
      await context.close();
    });
  }
}

for (const viewport of CINEMATIC_VIEWPORTS) {
  test(`captures the final cinematic composition at ${viewport.name}`, async ({
    browser,
  }) => {
    const mobile = viewport.width <= 390;
    const context = await browser.newContext({
      baseURL: "http://127.0.0.1:4173",
      colorScheme: "light",
      hasTouch: mobile,
      isMobile: mobile,
      reducedMotion: mobile ? "no-preference" : "reduce",
      viewport,
    });
    const page = await context.newPage();
    const diagnostics = monitorBrowser(page);
    await setDeterministicBrowserState(page);
    await openExperience(page);
    await waitForWebGLScene(page);

    await expectFinalViewportComposition(page, viewport);
    if (mobile) {
      await expectMobileInputEnvironment(page);
    }

    await mkdir(VISUAL_ARTIFACT_DIRECTORY, { recursive: true });
    await page.screenshot({
      animations: "disabled",
      path: resolve(
        VISUAL_ARTIFACT_DIRECTORY,
        `cinematic-${viewport.name}.png`,
      ),
    });

    await diagnostics.assertClean();
    await context.close();
  });
}

test("desktop keeps the complete live instrument open", async ({ page }) => {
  const diagnostics = monitorBrowser(page);
  await setDeterministicBrowserState(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openExperience(page);
  await waitForWebGLScene(page);

  await expect(
    page.getByRole("group", { name: "Telemetría completa" }),
  ).toHaveAttribute("open", "");
  await expect(page.getByText("26 piezas")).toBeVisible();
  await diagnostics.assertClean();
});

async function releaseWebGLContexts(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const canvas of document.querySelectorAll("canvas")) {
      const context =
        canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    }
  });
}

async function releaseAndCloseWebGLContext(
  page: Page,
  context: BrowserContext,
): Promise<void> {
  try {
    await releaseWebGLContexts(page);
  } finally {
    await context.close();
  }
}

async function createVisualPage(
  browser: Browser,
  viewport: { readonly width: number; readonly height: number },
  colorScheme: "light" | "dark",
) {
  const mobile = viewport.width <= 390;
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    colorScheme,
    hasTouch: mobile,
    isMobile: mobile,
    reducedMotion: mobile ? "no-preference" : "reduce",
    viewport,
  });
  const page = await context.newPage();
  return { context, page };
}

async function expectFinalViewportComposition(
  page: Page,
  viewport: { readonly width: number; readonly height: number },
): Promise<void> {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBe(0);

  const elements = [
    [page.getByRole("heading", { level: 1 }), "primary heading"],
    [page.getByRole("button", { name: "Desordenar cubo" }), "scramble CTA"],
    [
      page.getByRole("link", { name: "Comprar cubo" }).first(),
      "purchase CTA",
    ],
    [page.locator(".cube-scene"), "cube scene"],
    [
      page.getByRole("region", { name: "Controles del cubo" }),
      "control dock",
    ],
  ] as const;

  for (const [locator, label] of elements) {
    const box = await requiredBox(locator, label);
    expect(box.x, `${label} left edge`).toBeGreaterThanOrEqual(0);
    expect(box.y, `${label} top edge`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `${label} right edge`).toBeLessThanOrEqual(
      viewport.width + 1,
    );
    expect(box.y + box.height, `${label} bottom edge`).toBeLessThanOrEqual(
      viewport.height + 1,
    );
  }

  await expectGroundShadowLayout(page);
}

async function expectMobileInputEnvironment(page: Page): Promise<void> {
  expect(
    await page.evaluate(() => ({
      hoverNone: window.matchMedia("(hover: none)").matches,
      pointerCoarse: window.matchMedia("(pointer: coarse)").matches,
    })),
  ).toEqual({ hoverNone: true, pointerCoarse: true });
  await expect(
    page.getByText("Con el dedo: pieza = capa · fondo = rotar"),
  ).toBeVisible();
  await expect(
    page.getByText("Izquierdo: capas · Derecho: rotar"),
  ).toBeHidden();
  await expect(page.getByTestId("adaptive-cursor")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveAttribute(
    "data-cube-custom-cursor",
  );
}
