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
const MASTER_DURATION_MS = 6_400;
const REST_SNAPSHOT_TIME_MS = 6_300;
const OPACITY_REST_TOLERANCE = 0.000_5;
const STROKE_REST_TOLERANCE = 0.001;
const TRANSFORM_REST_TOLERANCE = 0.001;

const NODE_SURFACE_META = [
  { group: "beam", key: "beam" },
  { group: "title", key: "title" },
  { group: "tagline", key: "tagline" },
  { group: "intro-rule", key: "intro-rule" },
  ...Array.from({ length: 6 }, (_, index) => ({
    group: "glyph",
    key: `glyph-${index}`,
  })),
  { group: "footer", key: "footer-rule" },
  { group: "footer", key: "footer-product" },
  { group: "footer", key: "footer-line-1" },
  { group: "footer", key: "footer-line-2" },
  { group: "footer", key: "footer-line-3" },
  { group: "diagram", key: "diagram-base" },
  { group: "diagram", key: "diagram-risers" },
  { group: "diagram", key: "diagram-faces" },
] as const;

interface MotionSurfaceSnapshot {
  readonly animationCurrentTime: number | null;
  readonly animationDuration: string;
  readonly animationName: string;
  readonly animationPlayState: string;
  readonly bottom: number;
  readonly group: string;
  readonly index: number;
  readonly isText: boolean;
  readonly key: string;
  readonly left: number;
  readonly opacity: number;
  readonly pseudoElement: "::after" | "::before" | null;
  readonly right: number;
  readonly strokeDashoffset: number;
  readonly top: number;
  readonly transform: string;
}

interface AnimationContract {
  readonly animationName: string;
  readonly delay: number;
  readonly duration: number;
  readonly group: string;
  readonly key: string;
  readonly offsetsMs: readonly number[];
  readonly pseudoElement: "::after" | "::before" | null;
}

interface MotionSample {
  readonly activeSurfaceKeys: readonly string[];
  readonly changedSurfaces: readonly string[];
  readonly maximumTextTravel: number;
  readonly minimumTextOpacity: number;
  readonly surfaces: readonly MotionSurfaceSnapshot[];
  readonly time: number;
}

interface SurfaceWindow {
  readonly end: number;
  readonly group: string;
  readonly key: string;
  readonly start: number;
}

test("records one exact top-to-bottom register pass across all 20 spine surfaces", async ({
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
  const contracts = await readAddressedAnimationContracts(page);
  const windows = assertAddressedAnimationContracts(contracts);
  const maximumSimultaneousActive = maximumWindowConcurrency(windows);
  expect(maximumSimultaneousActive).toBe(5);
  await mkdir(VISUAL_ARTIFACT_DIRECTORY, { recursive: true });

  const samples: MotionSample[] = [];
  let previous: readonly MotionSurfaceSnapshot[] | null = null;
  let baseline: readonly MotionSurfaceSnapshot[] | null = null;
  const changedSurfaceKeys = new Set<string>();
  for (let time = 0; time <= 7_000; time += 200) {
    await seekSpineAnimations(page, time);
    const surfaces = await readSpineSurfaces(page);
    baseline ??= surfaces;
    const changedSurfaces = previous
      ? surfaces.filter((surface, index) =>
          hasVisibleChange(surface, previous![index]!),
        ).map(({ key }) => key)
      : [];
    if (previous) {
      changedSurfaces.forEach((key) => changedSurfaceKeys.add(key));
    }
    const textSurfaces = surfaces.filter((surface) => surface.isText);
    samples.push({
      activeSurfaceKeys: activeSurfaceKeysAt(windows, time),
      changedSurfaces,
      maximumTextTravel: Math.max(
        ...textSurfaces.map((surface) =>
          surfaceTravel(surface, baseline![surface.index]!),
        ),
      ),
      minimumTextOpacity: Math.min(
        ...textSurfaces.map((surface) => surface.opacity),
      ),
      surfaces,
      time,
    });
    if (time % 1_000 === 0) {
      await page.screenshot({
        path: resolve(
          VISUAL_ARTIFACT_DIRECTORY,
          `spine-filmstrip-${String(time).padStart(4, "0")}.png`,
        ),
      });
      expect(
        (await readSpineAnimationTimes(page)).every(
          (currentTime) => Math.abs(currentTime - time) < 0.01,
        ),
        `screenshot at ${time}ms must not advance the paused timeline`,
      ).toBe(true);
    }
    previous = surfaces;
  }
  await seekSpineAnimations(page, REST_SNAPSHOT_TIME_MS);
  const restSurfaces = await readSpineSurfaces(page);
  const restSnapshot = {
    surfaces: restSurfaces,
    time: REST_SNAPSHOT_TIME_MS,
  };
  expectExactSurfaceTime(restSurfaces, REST_SNAPSHOT_TIME_MS);
  expect(activeSurfaceKeysAt(windows, REST_SNAPSHOT_TIME_MS)).toEqual([]);

  const observedChangeEvents = assertObservedChangesStayInAuthoredWindows(
    samples,
    windows,
  );
  const inactiveRestComparisons = assertInactiveSamplesMatchRest(
    samples,
    windows,
    restSurfaces,
  );
  expect(
    Math.max(...samples.map((sample) => sample.changedSurfaces.length)),
  ).toBeLessThanOrEqual(5);

  const proofArtifact = {
    masterDurationMs: MASTER_DURATION_MS,
    maximumSimultaneousActive,
    maximumSimultaneousChanged: Math.max(
      ...samples.map((sample) => sample.changedSurfaces.length),
    ),
    maximumTextTravel: Math.max(
      ...samples.map((sample) => sample.maximumTextTravel),
    ),
    inactiveRestComparisons,
    minimumTextOpacity: Math.min(
      ...samples.map((sample) => sample.minimumTextOpacity),
    ),
    observedChangeEvents,
    restSnapshot,
    samples,
    surfaceCount: contracts.length,
    windows,
  };
  expect(proofArtifact.restSnapshot.time).toBe(6_300);
  expect(Array.isArray(proofArtifact.samples[0]!.changedSurfaces)).toBe(true);
  await writeFile(
    resolve(VISUAL_ARTIFACT_DIRECTORY, "spine-motion-samples.json"),
    JSON.stringify(proofArtifact, null, 2),
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
        .some((sample) => sample.changedSurfaces.length > 0),
    ).toBe(true);
  }
  expect(changedSurfaceKeys).toEqual(
    new Set([
      ...NODE_SURFACE_META.map(({ key }) => key),
      "upper-arc",
      "lower-arc",
    ]),
  );
  expect(contracts).toHaveLength(20);
  expect(
    samples.every(
      (sample) => sample.activeSurfaceKeys.length <= maximumSimultaneousActive,
    ),
  ).toBe(true);

  const at5Seconds = samples.find((sample) => sample.time === 5_000)!;
  expectExactSampleTime(at5Seconds, 5_000);
  expect(at5Seconds.activeSurfaceKeys).toEqual([
    "diagram-base",
    "diagram-risers",
    "diagram-faces",
  ]);
  expect(surface(at5Seconds, "beam")).toMatchObject({
    opacity: baseline![0]!.opacity,
    transform: baseline![0]!.transform,
  });
  expect(
    at5Seconds.surfaces
      .filter(({ group }) => group === "diagram")
      .every(({ opacity }) => opacity > 0.62),
  ).toBe(true);

  const at6Seconds = samples.find((sample) => sample.time === 6_000)!;
  expectExactSampleTime(at6Seconds, 6_000);
  expect(at6Seconds.activeSurfaceKeys).toEqual(["lower-arc"]);
  expect(surface(at6Seconds, "lower-arc").opacity).toBeGreaterThan(0.48);
  expect(surface(at6Seconds, "diagram-base").opacity).toBe(0.62);

  const atCycleBoundary = samples.find((sample) => sample.time === 6_400)!;
  expectExactSampleTime(atCycleBoundary, 6_400);
  expect(atCycleBoundary.activeSurfaceKeys).toEqual(["beam", "upper-arc"]);

  const atNextTitle = samples.find((sample) => sample.time === 7_000)!;
  expectExactSampleTime(atNextTitle, 7_000);
  expect(atNextTitle.activeSurfaceKeys).toEqual(["title"]);
  expect(surface(atNextTitle, "title").opacity).toBe(1);
  expect(surface(atNextTitle, "beam").opacity).toBe(0);

  const atUpperArc = samples.find((sample) => sample.time === 400)!;
  expect(surface(atUpperArc, "upper-arc").opacity).toBeGreaterThan(0.48);
  expect(surface(atUpperArc, "lower-arc")).toMatchObject({
    opacity: baseline![19]!.opacity,
    transform: baseline![19]!.transform,
  });
  const atLowerArc = samples.find((sample) => sample.time === 5_800)!;
  expect(surface(atLowerArc, "lower-arc").opacity).toBeGreaterThan(0.48);
  expect(surface(atLowerArc, "upper-arc")).toMatchObject({
    opacity: baseline![18]!.opacity,
    transform: baseline![18]!.transform,
  });

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
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();

  await expectAllSpinePlayStates(page, "running");
  await page.mouse.move(box!.x + 18, box!.y + box!.height * 0.5);
  await page.mouse.down({ button: "right" });
  await expect(root).toHaveAttribute("data-motion-paused", "true");
  await expectAllSpinePlayStates(page, "paused");
  await page.mouse.up({ button: "right" });
  await expect(root).toHaveAttribute("data-motion-paused", "false");
  await expectAllSpinePlayStates(page, "running");

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
  expect(
    await page.getByTestId("editorial-spine").evaluate((spine) =>
      (["::before", "::after"] as const).every(
        (pseudoElement) =>
          getComputedStyle(spine, pseudoElement).animationName === "none",
      ),
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

async function seekSpineAnimations(page: Page, time: number): Promise<void> {
  await page.getByTestId("editorial-spine").evaluate(
    async (spine, targetTime) => {
      const animations = spine
        .getAnimations({ subtree: true })
        .filter(
          (animation): animation is CSSAnimation =>
            animation instanceof CSSAnimation &&
            animation.animationName.includes("spine-"),
        );
      if (animations.length !== 20) {
        throw new Error(
          `Expected 20 desktop spine animations, received ${animations.length}`,
        );
      }
      for (const animation of animations) {
        animation.pause();
      }
      await Promise.all(animations.map((animation) => animation.ready));
      for (const animation of animations) {
        animation.currentTime = targetTime;
      }

      void spine.getBoundingClientRect();
      void getComputedStyle(spine, "::before").opacity;
      void getComputedStyle(spine, "::after").opacity;
      for (const node of spine.querySelectorAll('[data-spine-motion="true"]')) {
        void node.getBoundingClientRect();
        void getComputedStyle(node).opacity;
      }
    },
    time,
  );
}

async function readSpineAnimationTimes(page: Page): Promise<readonly number[]> {
  return page.getByTestId("editorial-spine").evaluate((spine) =>
    spine
      .getAnimations({ subtree: true })
      .filter(
        (animation): animation is CSSAnimation =>
          animation instanceof CSSAnimation &&
          animation.animationName.includes("spine-"),
      )
      .map((animation) =>
        typeof animation.currentTime === "number" ? animation.currentTime : -1,
      ),
  );
}

async function readSpineSurfaces(
  page: Page,
): Promise<readonly MotionSurfaceSnapshot[]> {
  return page.getByTestId("editorial-spine").evaluate(
    (spine, metadata) => {
      const nodes = Array.from(
        spine.querySelectorAll('[data-spine-motion="true"]'),
      );
      const animations = spine
        .getAnimations({ subtree: true })
        .filter(
          (animation): animation is CSSAnimation =>
            animation instanceof CSSAnimation &&
            animation.animationName.includes("spine-"),
        );
      const effectPseudoElement = (animation: CSSAnimation) =>
        animation.effect instanceof KeyframeEffect
          ? ((animation.effect as KeyframeEffect & {
              pseudoElement?: string | null;
            }).pseudoElement ?? null)
          : null;
      const animationFor = (target: Element, pseudoElement: string | null) =>
        animations.find(
          (animation) =>
            animation.effect instanceof KeyframeEffect &&
            animation.effect.target === target &&
            effectPseudoElement(animation) === pseudoElement,
        );

      const nodeSurfaces = nodes.map((node, index) => {
        const box = node.getBoundingClientRect();
        const styles = getComputedStyle(node);
        const animation = animationFor(node, null);
        if (!animation) {
          throw new Error(`Missing CSS animation for spine node ${index}`);
        }
        return {
          animationCurrentTime:
            typeof animation.currentTime === "number"
              ? animation.currentTime
              : null,
          animationDuration: styles.animationDuration,
          animationName: animation.animationName,
          animationPlayState: animation.playState,
          bottom: box.bottom,
          group: metadata[index]!.group,
          index,
          isText: (node.textContent?.trim().length ?? 0) > 0,
          key: metadata[index]!.key,
          left: box.left,
          opacity: Number(styles.opacity),
          pseudoElement: null,
          right: box.right,
          strokeDashoffset: Number.parseFloat(styles.strokeDashoffset) || 0,
          top: box.top,
          transform: styles.transform,
        };
      });
      const pseudoSurfaces = (["::before", "::after"] as const).map(
        (pseudoElement, offset) => {
          const animation = animationFor(spine, pseudoElement);
          if (!animation) {
            throw new Error(`Missing CSS animation for ${pseudoElement}`);
          }
          const styles = getComputedStyle(spine, pseudoElement);
          return {
            animationCurrentTime:
              typeof animation.currentTime === "number"
                ? animation.currentTime
                : null,
            animationDuration: styles.animationDuration,
            animationName: animation.animationName,
            animationPlayState: animation.playState,
            bottom: 0,
            group: "arc",
            index: metadata.length + offset,
            isText: false,
            key: pseudoElement === "::before" ? "upper-arc" : "lower-arc",
            left: 0,
            opacity: Number(styles.opacity),
            pseudoElement,
            right: 0,
            strokeDashoffset: Number.parseFloat(styles.strokeDashoffset) || 0,
            top: 0,
            transform: styles.transform,
          };
        },
      );
      return [...nodeSurfaces, ...pseudoSurfaces];
    },
    NODE_SURFACE_META,
  );
}

async function readAddressedAnimationContracts(
  page: Page,
): Promise<readonly AnimationContract[]> {
  return page.getByTestId("editorial-spine").evaluate(
    (spine, metadata) => {
      const nodes = Array.from(
        spine.querySelectorAll('[data-spine-motion="true"]'),
      );
      const animations = spine
        .getAnimations({ subtree: true })
        .filter(
          (animation): animation is CSSAnimation =>
            animation instanceof CSSAnimation &&
            animation.animationName.includes("spine-"),
        );
      const contracts = animations.map((animation) => {
        if (!(animation.effect instanceof KeyframeEffect)) {
          throw new Error("Addressed spine surface is missing its keyframes");
        }
        const effect = animation.effect as KeyframeEffect & {
          pseudoElement?: string | null;
        };
        const pseudoElement: "::after" | "::before" | null =
          effect.pseudoElement === "::before" || effect.pseudoElement === "::after"
            ? effect.pseudoElement
            : null;
        const nodeIndex = nodes.indexOf(effect.target as Element);
        const isUpperArc = effect.target === spine && pseudoElement === "::before";
        const isLowerArc = effect.target === spine && pseudoElement === "::after";
        if (nodeIndex < 0 && !isUpperArc && !isLowerArc) {
          throw new Error("Unaddressed animation found in the spine subtree");
        }
        const timing = effect.getTiming();
        const duration = Number(timing.duration);
        return {
          animationName: animation.animationName,
          delay: Math.round(timing.delay ?? 0),
          duration,
          group: nodeIndex >= 0 ? metadata[nodeIndex]!.group : "arc",
          key:
            nodeIndex >= 0
              ? metadata[nodeIndex]!.key
              : isUpperArc
                ? "upper-arc"
                : "lower-arc",
          offsetsMs: effect
            .getKeyframes()
            .map((keyframe) =>
              Math.round(
                Number(keyframe.computedOffset ?? keyframe.offset) * duration,
              ),
            ),
          pseudoElement:
            pseudoElement === "::before" || pseudoElement === "::after"
              ? pseudoElement
              : null,
        };
      });
      const order = [
        ...metadata.map(({ key }) => key),
        "upper-arc",
        "lower-arc",
      ];
      return contracts.sort(
        (left, right) => order.indexOf(left.key) - order.indexOf(right.key),
      );
    },
    NODE_SURFACE_META,
  );
}

function assertAddressedAnimationContracts(
  contracts: readonly AnimationContract[],
): readonly SurfaceWindow[] {
  const expected = [
    ["beam", "spine-beam-pass", 0, [0, 160, 550, 550, 6_400], null],
    ["title", "spine-title-register", 0, [0, 300, 600, 950, 6_400], null],
    ["tagline", "spine-tagline-register", 0, [0, 620, 950, 1_280, 6_400], null],
    ["intro-rule", "spine-rule-print", 0, [0, 620, 950, 1_280, 6_400], null],
    ...Array.from({ length: 6 }, (_, index) => [
      `glyph-${index}`,
      "spine-glyph-print",
      index * 210,
      [0, 1_180, 1_640, 2_100, 6_400],
      null,
    ] as const),
    ...[
      ["footer-rule", 0],
      ["footer-product", 0],
      ["footer-line-1", 145],
      ["footer-line-2", 290],
      ["footer-line-3", 435],
    ].map(([key, delay]) => [
      key,
      "spine-footer-register",
      delay,
      [0, 3_000, 3_557, 4_115, 6_400],
      null,
    ] as const),
    ...[
      ["diagram-base", 0],
      ["diagram-risers", 150],
      ["diagram-faces", 300],
    ].map(([key, delay]) => [
      key,
      "spine-diagram-draw",
      delay,
      [0, 4_450, 4_750, 5_300, 6_400],
      null,
    ] as const),
    ["upper-arc", "spine-arc-register", 0, [0, 275, 550, 5_450, 5_800, 6_150, 6_400], "::before"],
    ["lower-arc", "spine-arc-register", 0, [0, 275, 550, 5_450, 5_800, 6_150, 6_400], "::after"],
  ] as const;

  expect(contracts).toHaveLength(20);
  for (const [index, [key, name, delay, offsetsMs, pseudoElement]] of expected.entries()) {
    expect(contracts[index]!.key).toBe(key);
    expect(contracts[index]!.animationName).toMatch(new RegExp(`${name}$`));
    expect(contracts[index]!.duration).toBe(MASTER_DURATION_MS);
    expect(contracts[index]!.delay).toBe(delay);
    expect(contracts[index]!.offsetsMs).toEqual(offsetsMs);
    expect(contracts[index]!.pseudoElement).toBe(pseudoElement);
  }

  const windows = contracts.map((contract): SurfaceWindow => {
    const [startOffsetIndex, endOffsetIndex] = contract.key === "beam"
      ? [0, 2]
      : contract.key === "upper-arc"
        ? [0, 2]
        : contract.key === "lower-arc"
          ? [3, 5]
          : [1, 3];
    return {
      end: contract.offsetsMs[endOffsetIndex]! + contract.delay,
      group: contract.group,
      key: contract.key,
      start: contract.offsetsMs[startOffsetIndex]! + contract.delay,
    };
  });

  expect(windowFor(windows, "upper-arc")).toMatchObject({ start: 0, end: 550 });
  expect(windowFor(windows, "beam")).toMatchObject({ start: 0, end: 550 });
  expect(windowFor(windows, "title")).toMatchObject({ start: 300, end: 950 });
  expect(groupUnion(windows, ["tagline", "intro-rule"])).toEqual([620, 1_280]);
  expect(groupUnion(windows, ["glyph"])).toEqual([1_180, 3_150]);
  expect(groupUnion(windows, ["footer"])).toEqual([3_000, 4_550]);
  expect(groupUnion(windows, ["diagram"])).toEqual([4_450, 5_600]);
  expect(windowFor(windows, "lower-arc")).toMatchObject({
    start: 5_450,
    end: 6_150,
  });
  expect([windowFor(windows, "lower-arc").end, MASTER_DURATION_MS]).toEqual([
    6_150,
    6_400,
  ]);
  expect(
    windows.every(({ end, start }) => end - start <= 1_115),
  ).toBe(true);
  expect(
    windows.every(
      ({ end, start }) => MASTER_DURATION_MS - (end - start) >= 5_285,
    ),
  ).toBe(true);
  expect(maximumWindowConcurrency(windows)).toBeLessThanOrEqual(5);
  return windows;
}

function hasVisibleChange(
  current: MotionSurfaceSnapshot,
  previous: MotionSurfaceSnapshot,
): boolean {
  return (
    Math.abs(current.opacity - previous.opacity) > 0.002 ||
    Math.abs(current.strokeDashoffset - previous.strokeDashoffset) >
      STROKE_REST_TOLERANCE ||
    current.transform !== previous.transform
  );
}

function surfaceTravel(
  current: MotionSurfaceSnapshot,
  baseline: MotionSurfaceSnapshot,
): number {
  return Math.hypot(current.left - baseline.left, current.top - baseline.top);
}

async function expectAllSpinePlayStates(
  page: Page,
  expected: "paused" | "running",
): Promise<void> {
  await expect
    .poll(() =>
      page.getByTestId("editorial-spine").evaluate((spine) =>
        spine
          .getAnimations({ subtree: true })
          .filter(
            (animation): animation is CSSAnimation =>
              animation instanceof CSSAnimation &&
              animation.animationName.includes("spine-"),
          )
          .map((animation) => animation.playState),
      ),
    )
    .toEqual(Array.from({ length: 20 }, () => expected));
}

function windowFor(
  windows: readonly SurfaceWindow[],
  key: string,
): SurfaceWindow {
  const window = windows.find((candidate) => candidate.key === key);
  expect(window, `missing activity window for ${key}`).toBeDefined();
  return window!;
}

function groupUnion(
  windows: readonly SurfaceWindow[],
  groups: readonly string[],
): readonly [number, number] {
  const matching = windows.filter(({ group }) => groups.includes(group));
  return [
    Math.min(...matching.map(({ start }) => start)),
    Math.max(...matching.map(({ end }) => end)),
  ];
}

function maximumWindowConcurrency(windows: readonly SurfaceWindow[]): number {
  const boundaries = [...new Set(windows.flatMap(({ end, start }) => [start, end]))]
    .sort((left, right) => left - right);
  const probes = boundaries.flatMap((boundary, index) => {
    const next = boundaries[index + 1];
    return next === undefined ? [boundary] : [boundary, (boundary + next) / 2];
  });
  return Math.max(
    ...probes.map(
      (time) =>
        windows.filter(({ end, start }) => time >= start && time < end).length,
    ),
  );
}

function activeSurfaceKeysAt(
  windows: readonly SurfaceWindow[],
  time: number,
): readonly string[] {
  return windows
    .filter((window) => isSurfaceActiveAt(window, time))
    .map(({ key }) => key);
}

function isSurfaceActiveAt(window: SurfaceWindow, time: number): boolean {
  const iteration = Math.floor((time - window.start) / MASTER_DURATION_MS);
  const start = window.start + iteration * MASTER_DURATION_MS;
  const end = window.end + iteration * MASTER_DURATION_MS;
  return time >= start && time < end;
}

function authoredWindowIntersectsInterval(
  window: SurfaceWindow,
  intervalStart: number,
  intervalEnd: number,
): boolean {
  const firstIteration =
    Math.floor((intervalStart - window.end) / MASTER_DURATION_MS) - 1;
  const lastIteration =
    Math.ceil((intervalEnd - window.start) / MASTER_DURATION_MS) + 1;
  for (
    let iteration = firstIteration;
    iteration <= lastIteration;
    iteration += 1
  ) {
    const start = window.start + iteration * MASTER_DURATION_MS;
    const end = window.end + iteration * MASTER_DURATION_MS;
    if (start <= intervalEnd && end >= intervalStart) {
      return true;
    }
  }
  return false;
}

function assertObservedChangesStayInAuthoredWindows(
  samples: readonly MotionSample[],
  windows: readonly SurfaceWindow[],
): number {
  const windowsByKey = new Map(windows.map((window) => [window.key, window]));
  const violations: string[] = [];
  let observedChangeEvents = 0;

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1]!;
    const current = samples[index]!;
    expect(current.time - previous.time).toBe(200);
    for (const key of current.changedSurfaces) {
      observedChangeEvents += 1;
      const authoredWindow = windowsByKey.get(key);
      if (!authoredWindow) {
        violations.push(`${previous.time}-${current.time}ms ${key}: no window`);
      } else if (
        !authoredWindowIntersectsInterval(
          authoredWindow,
          previous.time,
          current.time,
        )
      ) {
        violations.push(
          `${previous.time}-${current.time}ms ${key}: outside ${authoredWindow.start}-${authoredWindow.end}ms/${MASTER_DURATION_MS}ms`,
        );
      }
    }
  }
  expect(
    violations,
    `observed off-window motion:\n${violations.join("\n")}`,
  ).toEqual([]);
  return observedChangeEvents;
}

function assertInactiveSamplesMatchRest(
  samples: readonly MotionSample[],
  windows: readonly SurfaceWindow[],
  restSurfaces: readonly MotionSurfaceSnapshot[],
): number {
  const windowsByKey = new Map(windows.map((window) => [window.key, window]));
  const restByKey = new Map(
    restSurfaces.map((restSurface) => [restSurface.key, restSurface]),
  );
  const checkedSurfaceKeys = new Set<string>();
  const violations: string[] = [];
  let inactiveRestComparisons = 0;

  expect(restByKey.size).toBe(20);
  for (const sample of samples) {
    for (const observed of sample.surfaces) {
      const authoredWindow = windowsByKey.get(observed.key);
      if (!authoredWindow) {
        violations.push(`${sample.time}ms ${observed.key}: no authored window`);
        continue;
      }
      if (isSurfaceActiveAt(authoredWindow, sample.time)) {
        continue;
      }
      const rest = restByKey.get(observed.key);
      if (!rest) {
        violations.push(`${sample.time}ms ${observed.key}: no 6300ms rest state`);
        continue;
      }
      inactiveRestComparisons += 1;
      checkedSurfaceKeys.add(observed.key);
      const opacityDelta = Math.abs(observed.opacity - rest.opacity);
      const transformDelta = transformMaximumDelta(
        observed.transform,
        rest.transform,
      );
      const strokeDelta = Math.abs(
        observed.strokeDashoffset - rest.strokeDashoffset,
      );
      if (opacityDelta > OPACITY_REST_TOLERANCE) {
        violations.push(
          `${sample.time}ms ${observed.key}: opacity delta ${opacityDelta} > ${OPACITY_REST_TOLERANCE}`,
        );
      }
      if (transformDelta > TRANSFORM_REST_TOLERANCE) {
        violations.push(
          `${sample.time}ms ${observed.key}: transform delta ${transformDelta} > ${TRANSFORM_REST_TOLERANCE}`,
        );
      }
      if (strokeDelta > STROKE_REST_TOLERANCE) {
        violations.push(
          `${sample.time}ms ${observed.key}: stroke delta ${strokeDelta} > ${STROKE_REST_TOLERANCE}`,
        );
      }
    }
  }

  expect(checkedSurfaceKeys).toEqual(new Set(restByKey.keys()));
  expect(
    violations,
    `inactive surfaces diverged from the independent 6300ms rest snapshot:\n${violations.join("\n")}`,
  ).toEqual([]);
  return inactiveRestComparisons;
}

function transformMaximumDelta(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  const numberPattern = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
  const leftValues = left.match(numberPattern)?.map(Number) ?? [];
  const rightValues = right.match(numberPattern)?.map(Number) ?? [];
  if (leftValues.length !== rightValues.length || leftValues.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(
    ...leftValues.map((value, index) => Math.abs(value - rightValues[index]!)),
  );
}

function expectExactSampleTime(sample: MotionSample, time: number): void {
  expectExactSurfaceTime(sample.surfaces, time);
}

function expectExactSurfaceTime(
  surfaces: readonly MotionSurfaceSnapshot[],
  time: number,
): void {
  expect(surfaces).toHaveLength(20);
  expect(
    surfaces.every(
      ({ animationCurrentTime }) =>
        typeof animationCurrentTime === "number" &&
        Math.abs(animationCurrentTime - time) < 0.01,
    ),
  ).toBe(true);
  expect(
    surfaces.every(
      ({ animationDuration }) => animationDuration === "6.4s",
    ),
  ).toBe(true);
}

function surface(sample: MotionSample, key: string): MotionSurfaceSnapshot {
  const matching = sample.surfaces.find((candidate) => candidate.key === key);
  expect(matching, `missing sampled surface ${key}`).toBeDefined();
  return matching!;
}
