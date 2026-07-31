import {
  expect,
  test,
  type Browser,
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
  { name: "mobile-320", width: 320, height: 700 },
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
  { name: "mobile-320", width: 320, height: 700 },
] as const;
const CINEMATIC_VIEWPORTS = [
  { name: "desktop-1600", width: 1600, height: 1000 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-320", width: 320, height: 700 },
] as const;
const AMBIENT_VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-320", width: 320, height: 700 },
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
      await diagnostics.assertClean();
    } finally {
      await releaseWebGLContexts(page);
      await context.close();
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

    const samples = [];
    for (const elapsedMs of [40_340, 213_140, 385_940, 558_740]) {
      samples.push(
        await page.evaluate(async (forcedTime) => {
          for (const animation of document.getAnimations()) {
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

          return {
            dock: opacity('section[class*="controlDock"]', "::before"),
            hero: opacity('[class*="heroRule"]', "::after"),
            matrix: opacity('ul[class*="pieceMatrix"]', "::after"),
            purchase: opacity('a[class*="purchaseButton"]', "::after"),
            summary: opacity('[data-testid="telemetry-summary-rail"]'),
          };
        }, elapsedMs),
      );
    }

    expect(samples[0].dock).toBeGreaterThan(0.2);
    expect(samples[0].hero).toBeGreaterThan(0);
    expect(samples[0].purchase).toBeGreaterThan(0);
    for (const sample of samples) {
      expect(
        Object.values(sample).filter((opacity) => opacity > 0.2),
      ).toHaveLength(1);
      for (const secondary of [
        sample.hero,
        sample.matrix,
        sample.purchase,
        sample.summary,
      ]) {
        expect(secondary).toBeLessThanOrEqual(0.12);
      }
    }
  } finally {
    await releaseWebGLContexts(page);
    await context.close();
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
  } finally {
    await releaseWebGLContexts(page);
    await context.close();
  }
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
    await region.scrollIntoViewIfNeeded();
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
  { name: "mobile-320", width: 320, height: 700 },
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
