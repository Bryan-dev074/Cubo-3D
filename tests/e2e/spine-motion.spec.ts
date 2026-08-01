import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";

import {
  monitorBrowser,
  setDeterministicBrowserState,
  waitForIntroReady,
  waitForWebGLScene,
} from "@/tests/e2e/helpers";

const VISUAL_ARTIFACT_DIRECTORY = resolve(
  process.cwd(),
  ".superpowers",
  "sdd",
);
const SPINE_SELECTOR = '[data-spine-motion="true"]';

interface MotionNodeSnapshot {
  readonly animationDuration: string;
  readonly animationName: string;
  readonly animationPlayState: string;
  readonly bottom: number;
  readonly index: number;
  readonly isText: boolean;
  readonly left: number;
  readonly opacity: number;
  readonly right: number;
  readonly top: number;
  readonly transform: string;
}

interface MotionSample {
  readonly changedNodes: number;
  readonly maximumTextTravel: number;
  readonly minimumTextOpacity: number;
  readonly nodes: readonly MotionNodeSnapshot[];
  readonly time: number;
}

test("records one readable top-to-bottom register pass across all 18 spine nodes", async ({
  browser,
}) => {
  const { context, page } = await createSpinePage(browser, {
    height: 900,
    reducedMotion: "no-preference",
    width: 1440,
  });
  const diagnostics = monitorBrowser(page);
  await skipIntro(page);

  const spineNodes = page.locator(SPINE_SELECTOR);
  await expect(spineNodes).toHaveCount(18);
  await expect(page.getByTestId("editorial-spine")).toBeVisible();
  await resetSpineAnimations(page);
  await mkdir(VISUAL_ARTIFACT_DIRECTORY, { recursive: true });

  const samples: MotionSample[] = [];
  let previous: readonly MotionNodeSnapshot[] | null = null;
  let baseline: readonly MotionNodeSnapshot[] | null = null;
  const changedNodeIndexes = new Set<number>();
  for (let time = 0; time <= 7_000; time += 200) {
    if (time > 0) {
      await page.waitForTimeout(200);
    }
    const nodes = await readSpineNodes(page);
    baseline ??= nodes;
    const changedNodes = previous
      ? nodes.filter((node, index) => hasVisibleChange(node, previous![index]!))
          .length
      : 0;
    if (previous) {
      nodes.forEach((node, index) => {
        if (hasVisibleChange(node, previous![index]!)) {
          changedNodeIndexes.add(index);
        }
      });
    }
    const textNodes = nodes.filter((node) => node.isText);
    samples.push({
      changedNodes,
      maximumTextTravel: Math.max(
        ...textNodes.map((node) => nodeTravel(node, baseline![node.index]!)),
      ),
      minimumTextOpacity: Math.min(...textNodes.map((node) => node.opacity)),
      nodes,
      time,
    });
    if (time % 1_000 === 0) {
      await page.screenshot({
        path: resolve(
          VISUAL_ARTIFACT_DIRECTORY,
          `spine-filmstrip-${String(time).padStart(4, "0")}.png`,
        ),
      });
    }
    previous = nodes;
  }
  await writeFile(
    resolve(VISUAL_ARTIFACT_DIRECTORY, "spine-motion-samples.json"),
    JSON.stringify(samples, null, 2),
    "utf8",
  );

  expect(samples.every((sample) => sample.minimumTextOpacity >= 0.78)).toBe(
    true,
  );
  expect(samples.every((sample) => sample.maximumTextTravel <= 3.1)).toBe(true);
  for (let second = 0; second < 7; second += 1) {
    expect(
      samples
        .slice(second * 5, second * 5 + 5)
        .some((sample) => sample.changedNodes > 0),
    ).toBe(true);
  }
  expect(changedNodeIndexes.size).toBe(18);
  expect(
    await page.getByTestId("spine-glyph").evaluateAll((nodes) =>
      nodes.every(
        (node) => getComputedStyle(node).animationDuration === "6.4s",
      ),
    ),
  ).toBe(true);
  await diagnostics.assertClean();
  await context.close();
});

test("pauses every spine node for interaction and resumes on release", async ({
  browser,
}) => {
  const { context, page } = await createSpinePage(browser, {
    height: 900,
    reducedMotion: "no-preference",
    width: 1440,
  });
  const diagnostics = monitorBrowser(page);
  await skipIntro(page);
  const canvas = await waitForWebGLScene(page);
  const root = page.locator("main#cubo");
  const nodes = page.locator(SPINE_SELECTOR);
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();

  await expectAllSpinePlayStates(nodes, "running");
  await page.mouse.move(box!.x + 18, box!.y + box!.height * 0.5);
  await page.mouse.down({ button: "right" });
  await expect(root).toHaveAttribute("data-motion-paused", "true");
  await expectAllSpinePlayStates(nodes, "paused");
  await page.mouse.up({ button: "right" });
  await expect(root).toHaveAttribute("data-motion-paused", "false");
  await expectAllSpinePlayStates(nodes, "running");

  await diagnostics.assertClean();
  await context.close();
});

test("reduced motion leaves zero infinite spine animations", async ({ browser }) => {
  const { context, page } = await createSpinePage(browser, {
    height: 900,
    reducedMotion: "reduce",
    width: 1440,
  });
  const diagnostics = monitorBrowser(page);
  await skipIntro(page);

  const infiniteAnimations = await page
    .getByTestId("editorial-spine")
    .evaluate((spine) =>
      spine
        .getAnimations({ subtree: true })
        .filter(
          (animation) => animation.effect?.getTiming().iterations === Infinity,
        )
        .map((animation) =>
          animation instanceof CSSAnimation ? animation.animationName : "unknown",
        ),
    );
  expect(infiniteAnimations).toEqual([]);
  expect(
    await page.locator(SPINE_SELECTOR).evaluateAll((nodes) =>
      nodes.every((node) => getComputedStyle(node).animationName === "none"),
    ),
  ).toBe(true);

  await diagnostics.assertClean();
  await context.close();
});

test("mobile hides the spine children and pulses only the 0.42rem ready rail", async ({
  browser,
}) => {
  const { context, page } = await createSpinePage(browser, {
    height: 844,
    isMobile: true,
    reducedMotion: "no-preference",
    width: 390,
  });
  const diagnostics = monitorBrowser(page);
  await skipIntro(page);
  const spine = page.getByTestId("editorial-spine");

  const mobile = await spine.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      animations: element
        .getAnimations({ subtree: true })
        .filter(
          (animation) => animation.effect?.getTiming().iterations === Infinity,
        )
        .map((animation) => ({
          duration: Number(animation.effect?.getTiming().duration),
          name:
            animation instanceof CSSAnimation ? animation.animationName : "unknown",
        })),
      animationDuration: styles.animationDuration,
      animationName: styles.animationName,
      childDisplays: Array.from(element.children, (child) =>
        getComputedStyle(child).display,
      ),
      height: styles.height,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  expect(mobile.animationName).toMatch(/spine-mobile-rail$/);
  expect(mobile.animationDuration).toBe("4.8s");
  expect(mobile.animations).toHaveLength(1);
  expect(mobile.animations[0]).toMatchObject({ duration: 4_800 });
  expect(mobile.animations[0]!.name).toMatch(/spine-mobile-rail$/);
  expect(mobile.childDisplays.every((display) => display === "none")).toBe(true);
  expect(Number.parseFloat(mobile.height)).toBeCloseTo(6.72, 2);
  expect(mobile.overflow).toBe(0);

  await diagnostics.assertClean();
  await context.close();
});

async function createSpinePage(
  browser: Browser,
  options: {
    readonly height: number;
    readonly isMobile?: boolean;
    readonly reducedMotion: "no-preference" | "reduce";
    readonly width: number;
  },
) {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    hasTouch: options.isMobile ?? false,
    isMobile: options.isMobile ?? false,
    reducedMotion: options.reducedMotion,
    viewport: { height: options.height, width: options.width },
  });
  const page = await context.newPage();
  await setDeterministicBrowserState(page);
  return { context, page };
}

async function skipIntro(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.keyboard.press("Escape");
  await waitForIntroReady(page);
  await page.waitForLoadState("networkidle");
}

async function resetSpineAnimations(page: Page): Promise<void> {
  await page.locator(SPINE_SELECTOR).evaluateAll((nodes) => {
    for (const node of nodes) {
      for (const animation of node.getAnimations()) {
        animation.currentTime = 0;
        animation.play();
      }
    }
  });
}

async function readSpineNodes(page: Page): Promise<readonly MotionNodeSnapshot[]> {
  return page.locator(SPINE_SELECTOR).evaluateAll((nodes) =>
    nodes.map((node, index) => {
      const box = node.getBoundingClientRect();
      const styles = getComputedStyle(node);
      return {
        animationDuration: styles.animationDuration,
        animationName: styles.animationName,
        animationPlayState: styles.animationPlayState,
        bottom: box.bottom,
        index,
        isText: (node.textContent?.trim().length ?? 0) > 0,
        left: box.left,
        opacity: Number(styles.opacity),
        right: box.right,
        top: box.top,
        transform: styles.transform,
      };
    }),
  );
}

function hasVisibleChange(
  current: MotionNodeSnapshot,
  previous: MotionNodeSnapshot,
): boolean {
  return (
    Math.abs(current.opacity - previous.opacity) > 0.002 ||
    nodeTravel(current, previous) > 0.02 ||
    current.transform !== previous.transform
  );
}

function nodeTravel(
  current: MotionNodeSnapshot,
  baseline: MotionNodeSnapshot,
): number {
  return Math.hypot(current.left - baseline.left, current.top - baseline.top);
}

async function expectAllSpinePlayStates(
  nodes: ReturnType<Page["locator"]>,
  expected: "paused" | "running",
): Promise<void> {
  await expect
    .poll(() =>
      nodes.evaluateAll((elements) =>
        elements.map((element) => getComputedStyle(element).animationPlayState),
      ),
    )
    .toEqual(Array.from({ length: 18 }, () => expected));
}
