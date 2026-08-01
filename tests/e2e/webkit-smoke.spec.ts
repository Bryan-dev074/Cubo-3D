import { expect, test } from "@playwright/test";

import {
  monitorBrowser,
  setDeterministicBrowserState,
  waitForIntroReady,
  waitForWebGLScene,
} from "@/tests/e2e/helpers";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

test("opens the real intro and preserves the mobile purchase path in WebKit", async ({
  page,
}) => {
  const diagnostics = monitorBrowser(page);
  await setDeterministicBrowserState(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const experience = page.locator("main#cubo");
  await expect(experience).toHaveAttribute(
    "data-intro-phase",
    /opening|reveal|drop|ready/,
  );
  if ((await page.getByTestId("package-intro").count()) > 0) {
    await expect(page.getByTestId("package-intro-flap")).toHaveCount(4);
  }

  await waitForIntroReady(page);
  await expect(page.getByTestId("package-intro")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 1, name: "Cubo Mágico 3D" }),
  ).toBeVisible();
  await waitForWebGLScene(page);
  await expect(page.getByTestId("adaptive-cursor")).toHaveCount(0);

  const portuguese = page.getByRole("button", { name: "PT" });
  const portugueseBox = await portuguese.boundingBox();
  expect(portugueseBox).not.toBeNull();
  expect(portugueseBox!.width).toBeGreaterThanOrEqual(44);
  expect(portugueseBox!.height).toBeGreaterThanOrEqual(44);
  await page.touchscreen.tap(
    portugueseBox!.x + portugueseBox!.width / 2,
    portugueseBox!.y + portugueseBox!.height / 2,
  );

  await expect(page.locator("html")).toHaveAttribute("lang", "pt");
  await expect(
    page.getByText(
      "Um clássico reinventado em 3D. Gire, desafie sua mente e volte a ordenar as cores.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Comprar cubo" }).first(),
  ).toHaveAttribute("href", buildWhatsAppUrl("pt"));

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
  await diagnostics.assertClean();
});
