import { expect, test, type CDPSession, type Page } from "@playwright/test";

import {
  monitorBrowser,
  openExperience,
  requestHtmlMove,
  setDeterministicBrowserState,
  sha256,
  solveDeterministicChallenge,
  startDeterministicScramble,
  waitForWebGLScene,
} from "@/tests/e2e/helpers";
import { createLayerMove, LAYER_NOTATION } from "@/lib/cube/notation";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

test.use({
  viewport: { width: 1440, height: 900 },
});

test.describe("idle WebGL rendering", () => {
  test.use({ reducedMotion: "no-preference" });

  test("keeps WebGL rendering idle after a real background orbit", async ({ page }) => {
    await forceNormalMotionPreference(page);
    await installWebGLDrawCallCounter(page);
    await page.goto("/");
    const canvas = page.locator(".cube-scene canvas");
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(350);

    await resetWebGLDrawCalls(page);
    await page.waitForTimeout(700);
    expect(await readWebGLDrawCalls(page)).toBe(0);

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    await resetWebGLDrawCalls(page);
    const backgroundX = box!.x + 18;
    const backgroundY = box!.y + box!.height * 0.5;
    await page.mouse.move(backgroundX, backgroundY);
    await page.mouse.down();
    await page.mouse.move(backgroundX + 96, backgroundY - 22, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => readWebGLDrawCalls(page)).toBeGreaterThan(0);

    await page.waitForTimeout(2_000);
    await resetWebGLDrawCalls(page);
    await page.waitForTimeout(700);
    expect(await readWebGLDrawCalls(page)).toBe(0);
  });
});

test("renders the semantic product shell and complete metadata", async ({
  page,
  request,
}) => {
  const diagnostics = monitorBrowser(page);
  await setDeterministicBrowserState(page);
  await openExperience(page);
  await waitForWebGLScene(page);

  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(
    page.getByText(
      "Desordenalo, resolvelo y descubrí por qué este clásico se siente mejor en tus manos.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Desordenar cubo" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Comprar cubo" }).first(),
  ).toHaveAttribute("href", buildWhatsAppUrl("es"));

  const skip = page.getByRole("link", { name: "Ir al cubo interactivo" });
  await page.keyboard.press("Tab");
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#cube-stage$/);

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://127.0.0.1:4173",
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "Cubo Mágico 3D",
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  await expect(page.locator('meta[name="theme-color"]')).toHaveCount(2);
  await expect(page.locator('link[rel="icon"]')).toHaveCount(1);

  const [robots, sitemap, openGraph] = await Promise.all([
    request.get("/robots.txt"),
    request.get("/sitemap.xml"),
    request.get("/opengraph-image"),
  ]);
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain(
    "Sitemap: http://127.0.0.1:4173/sitemap.xml",
  );
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain(
    "<loc>http://127.0.0.1:4173/</loc>",
  );
  expect(openGraph.status()).toBe(200);
  expect(openGraph.headers()["content-type"]).toContain("image/png");

  await diagnostics.assertClean();
});

test("preserves the exact cube state across ES/PT and supports keyboard turns", async ({
  page,
}) => {
  const diagnostics = monitorBrowser(page);
  await setDeterministicBrowserState(page);
  await openExperience(page);
  const canvas = await waitForWebGLScene(page);
  await canvas.evaluate((element) => {
    element.dataset.e2eIdentity = "preserved-canvas";
  });

  const right = LAYER_NOTATION.find((layer) => layer.id === "right")!;
  await requestHtmlMove(page, createLayerMove(right, "clockwise"), 1);

  await page.getByRole("button", { name: "PT" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt");
  await expect(
    page.getByText(
      "Embaralhe, resolva e descubra por que este clássico fica ainda melhor nas suas mãos.",
    ),
  ).toBeVisible();
  await expect(
    page.locator('[data-e2e-identity="preserved-canvas"]'),
  ).toHaveCount(1);
  await expect(canvas).toHaveAttribute("data-e2e-identity", "preserved-canvas");
  await expect(
    page.getByRole("link", { name: "Comprar cubo" }).first(),
  ).toHaveAttribute("href", buildWhatsAppUrl("pt"));
  await expect(page.getByTestId("telemetry-move-count")).toHaveText("1");

  const keyboardMove = page.getByRole("button", {
    name: "Direita anti-horário",
  });
  await keyboardMove.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("telemetry-move-count")).toHaveText("2");

  await diagnostics.assertClean();
});

test("scrambles, confirms a move, undoes it and resets the real cube", async ({
  page,
}) => {
  const diagnostics = monitorBrowser(page);
  await setDeterministicBrowserState(page);
  await openExperience(page);
  await waitForWebGLScene(page);

  await startDeterministicScramble(page);
  const fullTelemetry = page.getByRole("group", {
    name: "Telemetría completa",
  });
  await expect(
    fullTelemetry.getByText("En juego", { exact: true }),
  ).toBeVisible();

  const front = LAYER_NOTATION.find((layer) => layer.id === "front")!;
  await requestHtmlMove(page, createLayerMove(front, "clockwise"), 1);
  await page.getByRole("button", { name: "Deshacer" }).click();
  await expect(page.getByTestId("telemetry-move-count")).toHaveText("0");

  await page.getByRole("button", { name: "Reiniciar" }).click();
  await expect(page.getByTestId("telemetry-scramble-progress")).toHaveText(
    "0 / 20",
  );
  await expect(
    fullTelemetry.getByText("Listo", { exact: true }),
  ).toBeVisible();

  await diagnostics.assertClean();
});

test("supports a real layer drag and keeps background orbit separate", async ({
  page,
}) => {
  const diagnostics = monitorBrowser(page);
  await setDeterministicBrowserState(page);
  await openExperience(page);
  const canvas = await waitForWebGLScene(page);
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();

  const centerX = box!.x + box!.width * 0.5;
  const centerY = box!.y + box!.height * 0.5;
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX + 112, centerY + 8, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId("telemetry-move-count")).toHaveText("1", {
    timeout: 15_000,
  });

  const before = sha256(await canvas.screenshot());
  const backgroundX = box!.x + 18;
  const backgroundY = box!.y + box!.height * 0.5;
  await page.mouse.move(backgroundX, backgroundY);
  await page.mouse.down();
  await page.mouse.move(backgroundX + 96, backgroundY - 22, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(120);
  const after = sha256(await canvas.screenshot());

  expect(after).not.toBe(before);
  await expect(page.getByTestId("telemetry-move-count")).toHaveText("1");
  await diagnostics.assertClean();
});

test("supports a real touch layer drag and separate orbit on mobile", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    colorScheme: "light",
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const diagnostics = monitorBrowser(page);
  await setDeterministicBrowserState(page);
  await openExperience(page);
  const canvas = await waitForWebGLScene(page);
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  expect(await page.evaluate(() => navigator.maxTouchPoints)).toBeGreaterThan(0);

  const session = await context.newCDPSession(page);
  const centerX = box!.x + box!.width * 0.5;
  const centerY = box!.y + box!.height * 0.5;
  await dispatchTouchDrag(
    session,
    { x: centerX, y: centerY },
    { x: centerX + 92, y: centerY + 6 },
  );
  await expect(page.getByTestId("telemetry-move-count")).toHaveText("1", {
    timeout: 15_000,
  });

  const before = sha256(await canvas.screenshot());
  const backgroundX = box!.x + 7;
  const backgroundY = box!.y + box!.height * 0.48;
  await dispatchTouchDrag(
    session,
    { x: backgroundX, y: backgroundY },
    { x: backgroundX + 76, y: backgroundY - 22 },
  );
  await page.waitForTimeout(100);
  const after = sha256(await canvas.screenshot());

  expect(after).not.toBe(before);
  await expect(page.getByTestId("telemetry-move-count")).toHaveText("1");
  await diagnostics.assertClean();
  await context.close();
});

test("celebrates only after reversing the deterministic valid scramble", async ({
  page,
}) => {
  const diagnostics = monitorBrowser(page);
  await setDeterministicBrowserState(page);
  await openExperience(page);
  await waitForWebGLScene(page);

  await solveDeterministicChallenge(page);

  await expect(
    page.getByRole("heading", { name: "Lo resolviste." }),
  ).toBeVisible();
  await expect(
    page.getByText("Ahora llevá el desafío a tus manos."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Comprar ahora" }),
  ).toHaveAttribute("href", buildWhatsAppUrl("es"));
  await diagnostics.assertClean();
});

test("keeps the localized purchase and retry route when WebGL is unavailable", async ({
  page,
}) => {
  const diagnostics = monitorBrowser(page);
  await setDeterministicBrowserState(page, "pt");
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(window, "__originalCanvasGetContext", {
      configurable: true,
      value: original,
    });
    HTMLCanvasElement.prototype.getContext = function patchedGetContext(
      this: HTMLCanvasElement,
      contextId: string,
      ...args: unknown[]
    ) {
      if (
        contextId === "webgl" ||
        contextId === "webgl2" ||
        contextId === "experimental-webgl"
      ) {
        return null;
      }
      return Reflect.apply(original, this, [contextId, ...args]);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await openExperience(page);

  await expect(
    page.getByRole("heading", {
      name: "Seu navegador não pode mostrar o cubo 3D",
    }),
  ).toBeVisible();
  await expect(page.locator(".cube-scene canvas")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Comprar pelo WhatsApp" }),
  ).toHaveAttribute("href", buildWhatsAppUrl("pt"));

  await page.evaluate(() => {
    const original = (
      window as typeof window & {
        __originalCanvasGetContext: typeof HTMLCanvasElement.prototype.getContext;
      }
    ).__originalCanvasGetContext;
    HTMLCanvasElement.prototype.getContext = original;
  });
  await page
    .getByRole("button", { name: "Tentar cena 3D novamente" })
    .click();
  await waitForWebGLScene(page);
  await diagnostics.assertClean();
});

async function installWebGLDrawCallCounter(page: Page): Promise<void> {
  await page.addInitScript(() => {
    type DrawCallCounter = {
      drawArrays: number;
      drawElements: number;
    };
    type TestWindow = typeof window & {
      __cubo3dDrawCallCounter?: DrawCallCounter;
    };

    const testWindow = window as TestWindow;
    const counter: DrawCallCounter = { drawArrays: 0, drawElements: 0 };
    const patchedPrototypes = new WeakSet<object>();
    testWindow.__cubo3dDrawCallCounter = counter;

    const patchPrototype = (prototype: object) => {
      if (patchedPrototypes.has(prototype)) {
        return;
      }
      patchedPrototypes.add(prototype);
      for (const method of ["drawArrays", "drawElements"] as const) {
        const descriptor = Object.getOwnPropertyDescriptor(prototype, method);
        if (!descriptor || typeof descriptor.value !== "function") {
          continue;
        }
        const original = descriptor.value;
        Object.defineProperty(prototype, method, {
          ...descriptor,
          value: function trackedDrawCall(
          this: unknown,
          ...args: unknown[]
          ) {
            counter[method] += 1;
            return Reflect.apply(original, this, args);
          },
        });
      }
    };

    patchPrototype(WebGLRenderingContext.prototype);
    patchPrototype(WebGL2RenderingContext.prototype);
  });
}

async function forceNormalMotionPreference(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = (query: string) => {
      const media = originalMatchMedia(query);
      if (query !== "(prefers-reduced-motion: reduce)") {
        return media;
      }
      return {
        addEventListener: media.addEventListener.bind(media),
        dispatchEvent: media.dispatchEvent.bind(media),
        matches: false,
        media: media.media,
        onchange: null,
        removeEventListener: media.removeEventListener.bind(media),
      } as MediaQueryList;
    };
  });
}

async function resetWebGLDrawCalls(page: Page): Promise<void> {
  await page.evaluate(() => {
    const counter = (
      window as typeof window & {
        __cubo3dDrawCallCounter?: { drawArrays: number; drawElements: number };
      }
    ).__cubo3dDrawCallCounter;
    if (!counter) {
      throw new Error("WebGL draw-call counter was not installed");
    }
    counter.drawArrays = 0;
    counter.drawElements = 0;
  });
}

async function readWebGLDrawCalls(page: Page): Promise<number> {
  return page.evaluate(() => {
    const counter = (
      window as typeof window & {
        __cubo3dDrawCallCounter?: { drawArrays: number; drawElements: number };
      }
    ).__cubo3dDrawCallCounter;
    if (!counter) {
      throw new Error("WebGL draw-call counter was not installed");
    }
    return counter.drawArrays + counter.drawElements;
  });
}

async function dispatchTouchDrag(
  session: CDPSession,
  from: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number },
): Promise<void> {
  const touchPoint = (x: number, y: number) => ({
    force: 1,
    id: 1,
    radiusX: 4,
    radiusY: 4,
    x,
    y,
  });
  await session.send("Input.dispatchTouchEvent", {
    touchPoints: [touchPoint(from.x, from.y)],
    type: "touchStart",
  });
  for (let step = 1; step <= 8; step += 1) {
    const progress = step / 8;
    await session.send("Input.dispatchTouchEvent", {
      touchPoints: [
        touchPoint(
          from.x + (to.x - from.x) * progress,
          from.y + (to.y - from.y) * progress,
        ),
      ],
      type: "touchMove",
    });
  }
  await session.send("Input.dispatchTouchEvent", {
    touchPoints: [],
    type: "touchEnd",
  });
}
