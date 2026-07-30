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
  monitorBrowser,
  openExperience,
  setDeterministicBrowserState,
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

for (const viewport of MOBILE_VIEWPORTS) {
  test(`${viewport.name} keeps the hero, cube entry, touch targets and safe areas intact`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      baseURL: "http://127.0.0.1:4173",
      colorScheme: "light",
      reducedMotion: "reduce",
      viewport,
    });
    const page = await context.newPage();
    const diagnostics = monitorBrowser(page);
    await setDeterministicBrowserState(page);
    await openExperience(page);
    await waitForWebGLScene(page);

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
      page.getByText("Arrastrá para rotar el cubo"),
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
    await page
      .getByRole("button", { name: "Mostrar controles por capa" })
      .click();
    await expect(
      page.getByRole("group", { name: "Giros por capa" }),
    ).toBeVisible();
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

async function createVisualPage(
  browser: Browser,
  viewport: { readonly width: number; readonly height: number },
  colorScheme: "light" | "dark",
) {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    colorScheme,
    reducedMotion: "reduce",
    viewport,
  });
  const page = await context.newPage();
  return { context, page };
}
