import {
  expect,
  test,
  type Browser,
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
  test(`${viewport.name} keeps the first viewport, touch targets and safe areas intact`, async ({
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

    const firstViewportElements = [
      page.getByRole("heading", { level: 1 }),
      page.getByText(
        "Desordenalo, resolvelo y descubrí por qué este clásico se siente mejor en tus manos.",
      ),
      page.getByRole("button", { name: "Desordenar cubo" }),
      page.locator("#cube-stage"),
      page.getByRole("region", { name: "Controles del cubo" }),
      page.getByRole("group", { name: "Resumen de telemetría" }),
      page.getByRole("link", { name: "Comprar cubo" }).first(),
    ];
    for (const element of firstViewportElements) {
      const box = await element.boundingBox();
      expect(
        box,
        `missing box for ${await element.getAttribute("id")}`,
      ).not.toBeNull();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
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
          `task-6-${viewport.name}-${colorScheme}.png`,
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
