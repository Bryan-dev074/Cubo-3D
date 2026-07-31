# Cinematic Motion and Precise Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a two-second package-opening intro, a premium finite cube drop, a fixed stage shadow, right-button view rotation, strict initial-piece gesture ownership, a contextual cursor, and coordinated ambient motion without restoring idle WebGL rendering.

**Architecture:** Keep the final page rendered behind an HTML/CSS `PackageIntro`, coordinate it with a small reducer, and trigger a finite Three.js drop only after the WebGL scene reports ready. Replace the scene contact shadow with an HTML stage shadow, map OrbitControls explicitly to the right mouse button, and expose stable layer-gesture intent to one imperative desktop cursor.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, Three.js 0.185, React Three Fiber 9, Drei 10, CSS Modules, Vitest, Testing Library, Playwright.

## Global Constraints

- Normal-motion intro target: 2,000 ms per full document load.
- Package choreography: sealed 0–350 ms, opening 350–1,150 ms, reveal 1,150–1,350 ms, cube drop 1,350–2,000 ms.
- Cube drop: 4–6° initial tilt, one approximately 3% settlement, no deformation and no repeated bounce.
- Mouse: left button moves layers only; right button rotates the view only; left-button background drag does nothing.
- Touch: piece drag moves a layer; background drag rotates the view.
- A layer drag remains owned by the initial cubie, face, candidates, layer, and pointer ID until release or cancellation.
- The stage shadow never translates when the view or a layer moves.
- Custom cursor is fine-pointer only, DOM-based, `aria-hidden`, and never updates React state per pointer move.
- Ambient cycles run 4.8–9 seconds with long rests and pause during intro, interaction, queued moves, celebration, modal, hidden page, or reduced motion.
- `prefers-reduced-motion: reduce` uses a 140–180 ms crossfade, no flap rotation, no cube drop, no custom cursor, and no ambient loops.
- Do not add dependencies.
- Do not use `transition: all`, layout animation, infinite `useFrame`, Three.js autorotation, or perpetual WebGL invalidation.
- After every finite Three.js animation, idle WebGL draw calls must return to zero.
- Preserve ES/PT, keyboard layer controls, WhatsApp purchase flow, WebGL fallback, responsive behavior at 320/390/1024/1440/1600 widths, and the white/cobalt editorial composition.

## File Structure

### New files

- `components/experience/PackageIntro.tsx` — semantic-free package cover and phase completion events.
- `components/experience/useIntroSequence.ts` — intro reducer integration, active-time watchdog, scene readiness, skipping, visibility, and reduced-motion behavior.
- `components/experience/AdaptiveCursor.tsx` — one imperative fine-pointer cursor.
- `lib/motion/intro-sequence.ts` — pure intro state/event reducer and timing constants.
- `lib/motion/cube-drop.ts` — pure finite drop sampler.
- `lib/motion/cursor-intent.ts` — stable cursor intent types and normalization.
- `tests/unit/intro-sequence.test.ts` — reducer transitions and idempotence.
- `tests/unit/cube-drop.test.ts` — physical drop invariants.
- `tests/unit/cursor-intent.test.ts` — cursor mode normalization.
- `tests/components/package-intro.test.tsx` — intro rendering and completion.
- `tests/components/adaptive-cursor.test.tsx` — cursor lifecycle and input-mode behavior.

### Modified files

- `components/cube/Cubie.tsx` — hover handlers required for real cursor intent.
- `components/cube/useLayerGesture.ts` — primary-button filter, immutable gesture owner, cursor intent output.
- `components/cube/CubeScene.tsx` — right-button orbit mapping, context-menu suppression, scene-ready/drop plumbing, remove contact shadow.
- `components/cube/CubeCanvas.tsx` — forward scene-ready, drop, and cursor callbacks through the dynamic boundary.
- `components/cube/MagicCube.tsx` — finite intro-drop transform and completion signal.
- `components/experience/MagicCubeExperience.tsx` — intro orchestration, fixed shadow, cursor, and root motion pause state.
- `components/experience/HeroCopy.tsx` — current interaction hint remains structurally unchanged.
- `components/experience/LiveTelemetry.tsx` — consume the root pause contract without starting extra clocks.
- `components/experience/experience.module.css` — package, shadow, cursor, smoother transitions, ambient motion, responsive and reduced-motion styles.
- `app/globals.css` — motion tokens and safe global cursor activation.
- `lib/i18n/dictionaries.ts` — accurate ES/PT left/right interaction hint.
- `DESIGN.md` — motion durations, cursor modes, shadow, and intro tokens.
- `tests/components/layer-gesture.test.tsx` — mouse-button and cross-cubie ownership contracts.
- `tests/components/experience.test.tsx` — intro/cursor/root pause integration.
- `tests/unit/production-contracts.test.ts` — no contact shadow, no perpetual Three animation, no `transition: all`.
- `tests/e2e/experience.spec.ts` — intro, left/right, context menu, owner lock, static shadow, zero idle draws.
- `tests/e2e/responsive.spec.ts` — intro/cursor/mobile layout at required viewports.
- `tests/e2e/performance.spec.ts` — include intro completion before interaction metrics.
- `tests/e2e/helpers.ts` — wait for `data-intro-phase="ready"` before actions.

---

### Task 1: Make mouse and gesture ownership unambiguous

**Files:**

- Modify: `components/cube/useLayerGesture.ts`
- Modify: `components/cube/CubeScene.tsx`
- Modify: `lib/i18n/dictionaries.ts`
- Test: `tests/components/layer-gesture.test.tsx`
- Test: `tests/e2e/experience.spec.ts`

**Interfaces:**

- Consumes: existing `CubiePointerHandlers`, `useLayerGesture`, and `OrbitControls`.
- Produces: `isLayerGesturePointer(event): boolean`; right-button-only OrbitControls; immutable `ActiveGesture` ownership.

- [ ] **Step 1: Add failing component tests for button filtering and owner retention**

Extend the fixture event builder with real pointer data:

```ts
event: ({
  button = 0,
  clientX = 420,
  clientY = 245,
  object = initialObject,
  pointerType = "mouse",
  timeStamp = 100,
} = {}) => {
  const nativeEvent = nativePointerEvent("pointerdown", 7) as PointerEvent;
  Object.defineProperties(nativeEvent, {
    button: { configurable: true, value: button },
    pointerType: { configurable: true, value: pointerType },
    target: { configurable: true, value: nativeTarget },
  });
  return {
    button,
    clientX,
    clientY,
    face: { normal: new Vector3(0, 0, 1) },
    nativeEvent,
    object,
    point: new Vector3(1, 1, 1.5),
    pointerId: 7,
    pointerType,
    stopPropagation: vi.fn(),
    target: captureTarget,
    timeStamp,
  } as unknown as ThreeEvent<PointerEvent>;
}
```

Add these tests:

```ts
it("ignores the right mouse button before capture or orbit lock", () => {
  const fixture = createFixture();
  const { result } = renderHook(() => useLayerGesture(fixture.options));
  const event = fixture.event({ button: 2 });

  act(() => {
    result.current.handlersFor(fixture.cubie).onPointerDown(event);
  });

  expect(event.stopPropagation).not.toHaveBeenCalled();
  expect(fixture.captureTarget.setPointerCapture).not.toHaveBeenCalled();
  expect(fixture.onOrbitLockChange).not.toHaveBeenCalled();
  expect(result.current.isGestureActive).toBe(false);
});

it("keeps the initial cubie owner when move and release arrive over another cubie", () => {
  const fixture = createFixture();
  const other = fixture.cube.find(
    ({ position }) =>
      position[0] !== fixture.cubie.position[0] &&
      position[1] !== fixture.cubie.position[1] &&
      position[2] !== fixture.cubie.position[2],
  )!;
  const { result } = renderHook(() => useLayerGesture(fixture.options));
  const initialHandlers = result.current.handlersFor(fixture.cubie);
  const otherHandlers = result.current.handlersFor(other);

  act(() => {
    initialHandlers.onPointerDown(fixture.event({ timeStamp: 100 }));
    otherHandlers.onPointerMove(
      fixture.event({ clientX: 490, timeStamp: 140 }),
    );
    otherHandlers.onPointerUp(
      fixture.event({ clientX: 490, timeStamp: 160 }),
    );
  });

  expect(fixture.onMoveRequest).toHaveBeenCalledTimes(1);
  const move = fixture.onMoveRequest.mock.calls[0][0];
  const axisIndex = move.axis === "x" ? 0 : move.axis === "y" ? 1 : 2;
  expect(move.layer).toBe(fixture.cubie.position[axisIndex]);
  expect(move.layer).not.toBe(other.position[axisIndex]);
  expect(fixture.captureTarget.releasePointerCapture).toHaveBeenCalledWith(7);
});
```

Expose `cube` from `createFixture()` so the second test can select an opposite
cubie without constructing a second hook instance:

```ts
return {
  captureTarget,
  cube,
  cubie,
  // Keep the existing fixture fields unchanged.
};
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
npm test -- --run tests/components/layer-gesture.test.tsx
```

Expected: the right-button test fails because `onPointerDown` currently captures every button; the cross-cubie fixture changes fail until the fixture and immutable-owner assertion exist.

- [ ] **Step 3: Filter pointer input before propagation or capture**

Add to `useLayerGesture.ts`:

```ts
export function isLayerGesturePointer(
  event: ThreeEvent<PointerEvent>,
): boolean {
  const native = event.nativeEvent;
  return native.pointerType !== "mouse" || native.button === 0;
}
```

Use it as the first behavioral guard:

```ts
onPointerDown(event) {
  if (
    disabled ||
    gestureRef.current ||
    !isLayerGesturePointer(event)
  ) {
    return;
  }

  event.stopPropagation();
  // Existing candidate calculation and ActiveGesture creation stay here.
}
```

Keep all move calculations sourced from `gestureRef.current.cubie` and
`gestureRef.current.candidates`; never read the cubie closure inside
`onPointerMove` or `onPointerUp`.

- [ ] **Step 4: Map OrbitControls to right mouse only**

In `CubeScene.tsx`, import `MOUSE` from Three.js and apply:

```tsx
<div
  className="cube-scene"
  data-review-mode={reviewMode}
  role="img"
  aria-label={dictionaries[locale].stageLabel}
  aria-describedby="cube-drag-hint"
  tabIndex={0}
  onContextMenu={(event) => event.preventDefault()}
>
```

```tsx
<OrbitControls
  ref={controlsRef}
  makeDefault
  enabled={!isGestureActive && queue.length === 0}
  autoRotate={false}
  enableDamping={!reducedMotion}
  dampingFactor={0.075}
  enablePan={false}
  enableZoom={false}
  mouseButtons={{
    LEFT: undefined,
    MIDDLE: undefined,
    RIGHT: MOUSE.ROTATE,
  }}
  maxPolarAngle={Math.PI * 0.69}
  minPolarAngle={Math.PI * 0.2}
  rotateSpeed={0.62}
  target={presentation.cameraTarget}
/>
```

Update the localized hint:

```ts
dragHint: "Izquierdo: capas · Derecho: rotar",
```

```ts
dragHint: "Esquerdo: camadas · Direito: girar",
```

- [ ] **Step 5: Verify GREEN**

Run:

```powershell
npm test -- --run tests/components/layer-gesture.test.tsx tests/unit/i18n.test.ts
npm run typecheck
```

Expected: all focused tests and TypeScript pass.

- [ ] **Step 6: Add E2E mouse contracts**

Replace existing left-background orbit with explicit assertions:

```ts
const beforeLeftBackground = sha256(await canvas.screenshot());
await page.mouse.move(backgroundX, backgroundY);
await page.mouse.down({ button: "left" });
await page.mouse.move(backgroundX + 96, backgroundY - 22, { steps: 8 });
await page.mouse.up({ button: "left" });
expect(sha256(await canvas.screenshot())).toBe(beforeLeftBackground);

await page.mouse.move(backgroundX, backgroundY);
await page.mouse.down({ button: "right" });
await page.mouse.move(backgroundX + 96, backgroundY - 22, { steps: 8 });
await page.mouse.up({ button: "right" });
expect(sha256(await canvas.screenshot())).not.toBe(beforeLeftBackground);
await expect(page.getByTestId("telemetry-move-count")).toHaveText("1");
```

Also right-drag across the cube center and assert the movement counter stays
unchanged. Verify the scene cancels its own context menu:

```ts
const contextMenuPrevented = await canvas.evaluate((element) => {
  const event = new MouseEvent("contextmenu", {
    bubbles: true,
    button: 2,
    cancelable: true,
  });
  return element.dispatchEvent(event) === false && event.defaultPrevented;
});
expect(contextMenuPrevented).toBe(true);
```

- [ ] **Step 7: Commit Task 1**

```powershell
git add components/cube/useLayerGesture.ts components/cube/CubeScene.tsx lib/i18n/dictionaries.ts tests/components/layer-gesture.test.tsx tests/e2e/experience.spec.ts
git commit -m "fix: separate layer and view gestures"
```

---

### Task 2: Replace the moving 3D shadow with a fixed stage shadow

**Files:**

- Modify: `components/cube/CubeScene.tsx`
- Modify: `components/experience/MagicCubeExperience.tsx`
- Modify: `components/experience/experience.module.css`
- Test: `tests/unit/production-contracts.test.ts`
- Test: `tests/components/experience.test.tsx`
- Test: `tests/e2e/experience.spec.ts`

**Interfaces:**

- Consumes: `.stage`, `.cubeFrame`, responsive presentation.
- Produces: `data-testid="cube-ground-shadow"` fixed HTML shadow.

- [ ] **Step 1: Write failing static and component tests**

```ts
it("uses a fixed HTML stage shadow instead of a camera-projected contact shadow", () => {
  const scene = readFileSync(
    resolve(process.cwd(), "components/cube/CubeScene.tsx"),
    "utf8",
  );
  const experience = readFileSync(
    resolve(process.cwd(), "components/experience/MagicCubeExperience.tsx"),
    "utf8",
  );

  expect(scene).not.toContain("ContactShadows");
  expect(experience).toContain('data-testid="cube-ground-shadow"');
});
```

In `experience.test.tsx`, assert exactly one decorative shadow:

```ts
expect(screen.getByTestId("cube-ground-shadow")).toHaveAttribute(
  "aria-hidden",
  "true",
);
```

- [ ] **Step 2: Run tests and verify RED**

```powershell
npm test -- --run tests/unit/production-contracts.test.ts tests/components/experience.test.tsx
```

Expected: FAIL because `ContactShadows` is still mounted and no HTML shadow exists.

- [ ] **Step 3: Remove the Three.js contact shadow and obsolete budget field**

Remove `ContactShadows` from the Drei import, delete its JSX block, delete
`SceneBudget.shadowSize`, and remove the width-based shadow resolution branch.
Do not alter the existing three studio area lights.

- [ ] **Step 4: Add the fixed shadow beside the cube frame**

In the stage, before `.cubeFrame`:

```tsx
<div
  aria-hidden="true"
  className={styles.groundShadow}
  data-testid="cube-ground-shadow"
/>
```

Add the desktop baseline:

```css
.groundShadow {
  position: absolute;
  z-index: 1;
  top: 66%;
  left: 58%;
  width: clamp(15rem, 34vw, 34rem);
  aspect-ratio: 3.1;
  background: radial-gradient(
    ellipse at center,
    rgba(29, 37, 43, 0.34) 0%,
    rgba(29, 37, 43, 0.18) 38%,
    rgba(29, 37, 43, 0) 74%
  );
  filter: blur(0.38rem);
  opacity: 0.36;
  transform: translate(-50%, -50%) rotate(-4deg);
  transform-origin: center;
  pointer-events: none;
}
```

Add explicit 900 px, 390 px, and 320 px positions matching the existing camera
presentation. Keep the shadow outside `.cubeFrame` so camera changes cannot
move it.

- [ ] **Step 5: Verify unit/component GREEN**

```powershell
npm test -- --run tests/unit/production-contracts.test.ts tests/components/experience.test.tsx
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Add the fixed-shadow E2E**

```ts
const shadow = page.getByTestId("cube-ground-shadow");
const before = await shadow.boundingBox();
const beforeStyle = await shadow.evaluate((element) => ({
  opacity: getComputedStyle(element).opacity,
  transform: getComputedStyle(element).transform,
}));

await rightDragCube(page, canvas);

expect(await shadow.boundingBox()).toEqual(before);
expect(
  await shadow.evaluate((element) => ({
    opacity: getComputedStyle(element).opacity,
    transform: getComputedStyle(element).transform,
  })),
).toEqual(beforeStyle);
```

- [ ] **Step 7: Commit Task 2**

```powershell
git add components/cube/CubeScene.tsx components/experience/MagicCubeExperience.tsx components/experience/experience.module.css tests/unit/production-contracts.test.ts tests/components/experience.test.tsx tests/e2e/experience.spec.ts
git commit -m "fix: anchor cube shadow to the stage"
```

---

### Task 3: Build the package intro state machine and overlay

**Files:**

- Create: `lib/motion/intro-sequence.ts`
- Create: `components/experience/useIntroSequence.ts`
- Create: `components/experience/PackageIntro.tsx`
- Create: `tests/unit/intro-sequence.test.ts`
- Create: `tests/components/package-intro.test.tsx`
- Modify: `components/experience/MagicCubeExperience.tsx`
- Modify: `components/experience/experience.module.css`

**Interfaces:**

- Produces:

```ts
export type IntroPhase = "sealed" | "opening" | "reveal" | "drop" | "ready";

export interface IntroState {
  readonly phase: IntroPhase;
  readonly reducedMotion: boolean;
  readonly sceneReady: boolean;
}

export type IntroEvent =
  | { readonly type: "start" }
  | { readonly type: "package-opened" }
  | { readonly type: "scene-ready" }
  | { readonly type: "drop-complete" }
  | { readonly type: "skip" };
```

- `useIntroSequence` returns `{ phase, markSceneReady, markPackageOpened, markDropComplete, skip }`.
- `PackageIntro` consumes `phase`, `reducedMotion`, and `onPackageOpened`.

- [ ] **Step 1: Write failing reducer tests**

```ts
it("runs sealed, opening, reveal, drop and ready in order", () => {
  let state = createIntroState(false);
  state = introReducer(state, { type: "start" });
  expect(state.phase).toBe("opening");

  state = introReducer(state, { type: "package-opened" });
  expect(state.phase).toBe("reveal");

  state = introReducer(state, { type: "scene-ready" });
  expect(state.phase).toBe("drop");

  state = introReducer(state, { type: "drop-complete" });
  expect(state.phase).toBe("ready");
});

it("is idempotent and skips motion when reduced motion is enabled", () => {
  let reduced = introReducer(createIntroState(true), { type: "start" });
  expect(reduced.phase).toBe("opening");
  reduced = introReducer(reduced, { type: "package-opened" });
  expect(reduced.phase).toBe("ready");
  expect(introReducer(reduced, { type: "drop-complete" })).toBe(reduced);
});

it("waits in reveal until the scene is ready", () => {
  let state = introReducer(createIntroState(false), { type: "start" });
  state = introReducer(state, { type: "package-opened" });
  expect(state).toMatchObject({ phase: "reveal", sceneReady: false });
});
```

- [ ] **Step 2: Run reducer tests and verify RED**

```powershell
npm test -- --run tests/unit/intro-sequence.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the pure reducer and constants**

```ts
export const INTRO_PACKAGE_MS = 1_350;
export const INTRO_REDUCED_MS = 180;
export const INTRO_DROP_MS = 650;

export function createIntroState(reducedMotion: boolean): IntroState {
  return {
    phase: "sealed",
    reducedMotion,
    sceneReady: false,
  };
}

export function introReducer(
  state: IntroState,
  event: IntroEvent,
): IntroState {
  if (state.phase === "ready") {
    return state;
  }
  if (event.type === "skip") {
    return { ...state, phase: "ready" };
  }
  if (event.type === "scene-ready") {
    return {
      ...state,
      sceneReady: true,
      phase: state.phase === "reveal" ? "drop" : state.phase,
    };
  }
  if (event.type === "start" && state.phase === "sealed") {
    return { ...state, phase: "opening" };
  }
  if (event.type === "package-opened" && state.phase === "opening") {
    return {
      ...state,
      phase: state.reducedMotion
        ? "ready"
        : state.sceneReady
          ? "drop"
          : "reveal",
    };
  }
  if (event.type === "drop-complete" && state.phase === "drop") {
    return { ...state, phase: "ready" };
  }
  return state;
}
```

- [ ] **Step 4: Verify reducer GREEN**

```powershell
npm test -- --run tests/unit/intro-sequence.test.ts
```

Expected: all intro reducer tests pass.

- [ ] **Step 5: Write failing PackageIntro component tests**

```tsx
it("is decorative, blocks accidental pointer activation, and reports completion once", async () => {
  const onPackageOpened = vi.fn();
  const { rerender } = render(
    <PackageIntro
      phase="opening"
      reducedMotion={false}
      onPackageOpened={onPackageOpened}
    />,
  );
  const intro = screen.getByTestId("package-intro");
  expect(intro).toHaveAttribute("aria-hidden", "true");
  fireEvent.animationEnd(screen.getByTestId("package-intro-timeline"));
  fireEvent.animationEnd(screen.getByTestId("package-intro-timeline"));
  expect(onPackageOpened).toHaveBeenCalledTimes(1);

  rerender(
    <PackageIntro
      phase="ready"
      reducedMotion={false}
      onPackageOpened={onPackageOpened}
    />,
  );
  expect(screen.queryByTestId("package-intro")).not.toBeInTheDocument();
});
```

- [ ] **Step 6: Implement PackageIntro**

Use one outer timeline and four physical flap nodes:

```tsx
export function PackageIntro({
  onPackageOpened,
  phase,
  reducedMotion,
}: PackageIntroProps) {
  const completedRef = useRef(false);
  if (phase === "ready") {
    return null;
  }

  const completeOnce = () => {
    if (!completedRef.current) {
      completedRef.current = true;
      onPackageOpened();
    }
  };

  return (
    <div
      aria-hidden="true"
      className={styles.packageIntro}
      data-phase={phase}
      data-reduced-motion={String(reducedMotion)}
      data-testid="package-intro"
    >
      <div
        className={styles.packageIntroTimeline}
        data-testid="package-intro-timeline"
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) {
            completeOnce();
          }
        }}
      >
        <div className={styles.packageIntroSpine}>CUBO 3D</div>
        <div className={styles.packageIntroRegistration} />
        <div className={styles.packageFlap} data-flap="top" />
        <div className={styles.packageFlap} data-flap="right" />
        <div className={styles.packageFlap} data-flap="bottom" />
        <div className={styles.packageFlap} data-flap="left" />
        <div className={styles.packageSeal}>CUBO 3D</div>
      </div>
    </div>
  );
}
```

The CSS timeline runs `INTRO_PACKAGE_MS`; flap transforms use perspective,
individual origins, and 40–60 ms offsets. The reveal uses opacity only and the
overlay keeps pointer events until the `drop` phase.

- [ ] **Step 7: Implement useIntroSequence with active-time watchdog**

The hook starts once, handles Escape/Tab, and runs a finite visible-time rAF
only while the package is opening. Use `INTRO_REDUCED_MS` instead of
`INTRO_PACKAGE_MS` when reduced motion is active:

```ts
useEffect(() => {
  dispatch({ type: "start" });
}, []);

useEffect(() => {
  if (state.phase !== "opening") {
    return;
  }
  const duration = state.reducedMotion
    ? INTRO_REDUCED_MS
    : INTRO_PACKAGE_MS;
  let elapsed = 0;
  let previous = performance.now();
  let frame = 0;
  const tick = (now: number) => {
    if (document.visibilityState === "visible") {
      elapsed += Math.min(50, now - previous);
    }
    previous = now;
    if (elapsed >= duration) {
      dispatch({ type: "package-opened" });
      return;
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}, [state.phase, state.reducedMotion]);
```

Register one `keydown` listener: Escape and Tab call `skip()`. Cleanup it on
unmount. Package `animationend` and the active-time watchdog both dispatch the
same idempotent event.

- [ ] **Step 8: Mount intro orchestration and styles**

Mount `PackageIntro` as the first child of `<main>`, add
`data-intro-phase={intro.phase}` to `<main>`, and keep `.carton` rendered at all
times. Add 1440/390/320 flap geometry and reduced-motion crossfade.

- [ ] **Step 9: Verify Task 3**

```powershell
npm test -- --run tests/unit/intro-sequence.test.ts tests/components/package-intro.test.tsx tests/components/experience.test.tsx
npm run typecheck
```

Expected: PASS with no timer/listener warnings.

- [ ] **Step 10: Commit Task 3**

```powershell
git add lib/motion/intro-sequence.ts components/experience/useIntroSequence.ts components/experience/PackageIntro.tsx components/experience/MagicCubeExperience.tsx components/experience/experience.module.css tests/unit/intro-sequence.test.ts tests/components/package-intro.test.tsx tests/components/experience.test.tsx
git commit -m "feat: open the product package on entry"
```

---

### Task 4: Animate the real cube drop and scene-ready handshake

**Files:**

- Create: `lib/motion/cube-drop.ts`
- Create: `tests/unit/cube-drop.test.ts`
- Modify: `components/cube/CubeCanvas.tsx`
- Modify: `components/cube/CubeScene.tsx`
- Modify: `components/cube/MagicCube.tsx`
- Modify: `components/experience/MagicCubeExperience.tsx`
- Test: `tests/components/cube-canvas.test.tsx`
- Test: `tests/unit/production-contracts.test.ts`

**Interfaces:**

```ts
export interface CubeDropSample {
  readonly offsetY: number;
  readonly rotationX: number;
  readonly rotationZ: number;
  readonly shadowOpacity: number;
  readonly shadowScale: number;
}

export function sampleCubeDrop(progress: number): CubeDropSample;
```

Add optional callbacks through the scene boundary:

```ts
readonly introPhase?: IntroPhase;
readonly onDropComplete?: () => void;
readonly onSceneReady?: () => void;
```

- [ ] **Step 1: Write failing physical-invariant tests**

```ts
it("falls from above, settles once, and ends exactly canonical", () => {
  const start = sampleCubeDrop(0);
  const contact = sampleCubeDrop(0.78);
  const settle = sampleCubeDrop(0.9);
  const end = sampleCubeDrop(1);

  expect(start.offsetY).toBeGreaterThan(4);
  expect(Math.abs(start.rotationZ)).toBeGreaterThan(0);
  expect(contact.offsetY).toBeCloseTo(0, 4);
  expect(settle.offsetY).toBeLessThan(0);
  expect(Math.abs(settle.offsetY)).toBeLessThan(0.1);
  expect(end).toEqual({
    offsetY: 0,
    rotationX: 0,
    rotationZ: 0,
    shadowOpacity: 1,
    shadowScale: 1,
  });
});

it("clamps invalid progress and never produces a second bounce", () => {
  expect(sampleCubeDrop(-1)).toEqual(sampleCubeDrop(0));
  expect(sampleCubeDrop(2)).toEqual(sampleCubeDrop(1));
  const postContact = [0.8, 0.85, 0.9, 0.95, 1].map(
    (progress) => sampleCubeDrop(progress).offsetY,
  );
  expect(postContact.filter((value) => value > 0)).toHaveLength(0);
});
```

- [ ] **Step 2: Run and verify RED**

```powershell
npm test -- --run tests/unit/cube-drop.test.ts
```

Expected: FAIL because `sampleCubeDrop` does not exist.

- [ ] **Step 3: Implement the finite sampler**

```ts
const INITIAL_TILT = (5 * Math.PI) / 180;

export function sampleCubeDrop(progress: number): CubeDropSample {
  const p = Math.min(1, Math.max(0, progress));
  const contactProgress = Math.min(1, p / 0.78);
  const fall = 1 - contactProgress * contactProgress;
  const settleProgress = Math.min(1, Math.max(0, (p - 0.78) / 0.22));
  const settlement =
    p < 0.78
      ? 0
      : -0.065 *
        Math.sin(settleProgress * Math.PI) *
        (1 - settleProgress * 0.2);
  const orientation = 1 - smoothstep(0.12, 0.86, p);
  const contactCue = smoothstep(0.28, 0.82, p);

  if (p === 1) {
    return {
      offsetY: 0,
      rotationX: 0,
      rotationZ: 0,
      shadowOpacity: 1,
      shadowScale: 1,
    };
  }

  return {
    offsetY: 4.8 * fall + settlement,
    rotationX: -INITIAL_TILT * 0.45 * orientation,
    rotationZ: INITIAL_TILT * orientation,
    shadowOpacity: 0.12 + contactCue * 0.88,
    shadowScale: 0.74 + contactCue * 0.26,
  };
}
```

Implement local `smoothstep(edge0, edge1, value)` with clamping.

- [ ] **Step 4: Verify sampler GREEN**

```powershell
npm test -- --run tests/unit/cube-drop.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add scene-ready plumbing**

Call `onSceneReady` exactly once from Canvas `onCreated` after tone mapping is
configured. Forward `introPhase` and `onDropComplete` through `CubeCanvas`,
`CubeScene`, `CubeStudio`, and `MagicCube`.

Protect dynamic loading and fallback: WebGL failure must never leave the intro
waiting; `onSceneError` also calls `intro.skip()`.

- [ ] **Step 6: Apply the finite drop to the root group**

In `MagicCube`, keep a drop start ref and finite rAF invalidator:

```ts
useEffect(() => {
  if (introPhase !== "drop" || reducedMotion) {
    dropStartRef.current = null;
    applyRootDrop(rootRef.current, presentationPosition, sampleCubeDrop(1));
    return;
  }

  dropStartRef.current = performance.now();
  let frame = 0;
  const animate = (time: number) => {
    invalidate();
    const elapsed = time - (dropStartRef.current ?? time);
    if (elapsed < INTRO_DROP_MS) {
      frame = requestAnimationFrame(animate);
    }
  };
  frame = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(frame);
}, [introPhase, invalidate, presentationPosition, reducedMotion]);
```

In the existing `useFrame`, sample only while `dropStartRef` is non-null. On
the first frame at progress 1, apply the canonical transform, clear the ref,
and call `onDropComplete` once. Compose drop rotation with the root's normal
orientation; do not modify individual cubie pivots.

Set CSS variables on `<main>` from the same sample only at phase boundaries for
the HTML shadow: start values at `drop`, final values at `ready`. CSS performs
the shadow interpolation without moving its base transform.

- [ ] **Step 7: Add production contracts**

Assert:

```ts
expect(sceneSource).not.toContain("autoRotate={true}");
expect(sceneSource).toContain('frameloop="demand"');
expect(magicCubeSource).toContain("INTRO_DROP_MS");
expect(magicCubeSource).not.toMatch(/useFrame\\([^)]*=>[^]*autoRotate/);
```

- [ ] **Step 8: Verify Task 4**

```powershell
npm test -- --run tests/unit/cube-drop.test.ts tests/components/cube-canvas.test.tsx tests/unit/production-contracts.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 9: Commit Task 4**

```powershell
git add lib/motion/cube-drop.ts components/cube/CubeCanvas.tsx components/cube/CubeScene.tsx components/cube/MagicCube.tsx components/experience/MagicCubeExperience.tsx tests/unit/cube-drop.test.ts tests/components/cube-canvas.test.tsx tests/unit/production-contracts.test.ts
git commit -m "feat: drop the real cube into the stage"
```

---

### Task 5: Add the adaptive desktop cursor

**Files:**

- Create: `lib/motion/cursor-intent.ts`
- Create: `components/experience/AdaptiveCursor.tsx`
- Create: `tests/unit/cursor-intent.test.ts`
- Create: `tests/components/adaptive-cursor.test.tsx`
- Modify: `components/cube/Cubie.tsx`
- Modify: `components/cube/useLayerGesture.ts`
- Modify: `components/cube/CubeScene.tsx`
- Modify: `components/cube/CubeCanvas.tsx`
- Modify: `components/experience/MagicCubeExperience.tsx`
- Modify: `components/experience/experience.module.css`

**Interfaces:**

```ts
export type CursorMode =
  | "idle"
  | "action"
  | "layer-ready"
  | "layer-drag"
  | "orbit"
  | "disabled";

export interface CursorIntent {
  readonly axis?: Axis;
  readonly direction?: "negative" | "positive";
  readonly mode: CursorMode;
}

export const IDLE_CURSOR_INTENT: CursorIntent = Object.freeze({ mode: "idle" });
```

`CubeSceneProps` adds:

```ts
readonly onCursorIntentChange?: (intent: CursorIntent) => void;
```

- [ ] **Step 1: Write failing cursor normalization tests**

```ts
it("derives axis and direction from a real layer move", () => {
  expect(cursorIntentForMove({ axis: "z", layer: 1, turns: -1 })).toEqual({
    axis: "z",
    direction: "negative",
    mode: "layer-drag",
  });
});

it("returns stable frozen idle and disabled intents", () => {
  expect(normalizeCursorIntent({ mode: "idle" })).toBe(IDLE_CURSOR_INTENT);
  expect(normalizeCursorIntent({ mode: "disabled" })).toBe(
    DISABLED_CURSOR_INTENT,
  );
});
```

- [ ] **Step 2: Run and verify RED**

```powershell
npm test -- --run tests/unit/cursor-intent.test.ts
```

Expected: FAIL because the cursor module does not exist.

- [ ] **Step 3: Implement pure cursor intent helpers**

Use frozen constants for stateless modes. Map `move.axis` and the sign of
`move.turns` without storing screen coordinates in React.

- [ ] **Step 4: Extend cubie handlers with hover intent**

Add `onPointerOver` and `onPointerOut` to `CubiePointerHandlers`. In
`useLayerGesture`:

```ts
onPointerOver() {
  if (!disabled && !gestureRef.current) {
    onCursorIntentChange({ mode: "layer-ready" });
  }
},
onPointerOut() {
  if (!gestureRef.current) {
    onCursorIntentChange(IDLE_CURSOR_INTENT);
  }
},
```

After `resolveLayerGesture`, emit `cursorIntentForMove(move)` when non-null.
During clear/cancel, emit idle or disabled. Because the move comes from the
stored initial candidates, crossing cubies cannot change its owner.

- [ ] **Step 5: Write failing AdaptiveCursor tests**

```tsx
it("moves imperatively, changes mode, and never captures pointer events", () => {
  const { rerender } = render(
    <AdaptiveCursor intent={{ mode: "layer-ready" }} paused={false} />,
  );
  const cursor = screen.getByTestId("adaptive-cursor");
  fireEvent.pointerMove(window, { clientX: 120, clientY: 80 });
  flushAnimationFrame();
  expect(cursor).toHaveAttribute("data-mode", "layer-ready");
  expect(cursor.getAttribute("style")).toContain("translate3d(120px, 80px, 0)");
  expect(cursor).toHaveStyle({ pointerEvents: "none" });

  rerender(<AdaptiveCursor intent={{ mode: "orbit" }} paused={false} />);
  expect(cursor).toHaveAttribute("data-mode", "orbit");
});

it("does not mount for coarse pointers or reduced motion", () => {
  mockMedia({ coarse: true, reducedMotion: false });
  const { rerender } = render(
    <AdaptiveCursor intent={{ mode: "idle" }} paused={false} />,
  );
  expect(screen.queryByTestId("adaptive-cursor")).not.toBeInTheDocument();

  mockMedia({ coarse: false, reducedMotion: true });
  rerender(<AdaptiveCursor intent={{ mode: "idle" }} paused={false} />);
  expect(screen.queryByTestId("adaptive-cursor")).not.toBeInTheDocument();
});
```

- [ ] **Step 6: Implement one imperative cursor**

The component listens to `pointermove`, `pointerleave`, `pointerdown`, and
`pointerup`. It stores coordinates in refs and schedules at most one rAF:

```ts
const flush = () => {
  frameRef.current = 0;
  nodeRef.current?.style.setProperty(
    "transform",
    `translate3d(${pointRef.current.x}px, ${pointRef.current.y}px, 0)`,
  );
};

const onPointerMove = (event: PointerEvent) => {
  pointRef.current = { x: event.clientX, y: event.clientY };
  if (frameRef.current === 0) {
    frameRef.current = requestAnimationFrame(flush);
  }
};
```

Use `event.target.closest("button, a, summary")` to render `action` unless a
cube gesture intent has higher priority. A right-button down within
`#cube-stage` temporarily renders `orbit`. Cleanup every listener and pending
rAF.

- [ ] **Step 7: Add cursor visuals**

Create one fixed 24 px shell with a dot, broken ring, quarter-turn arc, axis
label, and orbit ring using pseudo-elements. Only transform/opacity change
between modes. Activate `cursor: none` under:

```css
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .experience[data-custom-cursor="true"],
  .experience[data-custom-cursor="true"] * {
    cursor: none;
  }
}
```

Do not hide the native cursor until `AdaptiveCursor` reports mounted.

- [ ] **Step 8: Verify Task 5**

```powershell
npm test -- --run tests/unit/cursor-intent.test.ts tests/components/adaptive-cursor.test.tsx tests/components/layer-gesture.test.tsx
npm run typecheck
```

Expected: PASS.

- [ ] **Step 9: Commit Task 5**

```powershell
git add lib/motion/cursor-intent.ts components/experience/AdaptiveCursor.tsx components/cube/Cubie.tsx components/cube/useLayerGesture.ts components/cube/CubeScene.tsx components/cube/CubeCanvas.tsx components/experience/MagicCubeExperience.tsx components/experience/experience.module.css tests/unit/cursor-intent.test.ts tests/components/adaptive-cursor.test.tsx tests/components/layer-gesture.test.tsx
git commit -m "feat: communicate cube gestures through the cursor"
```

---

### Task 6: Coordinate smoother ambient motion

**Files:**

- Modify: `app/globals.css`
- Modify: `components/experience/MagicCubeExperience.tsx`
- Modify: `components/experience/LiveTelemetry.tsx`
- Modify: `components/experience/experience.module.css`
- Modify: `DESIGN.md`
- Test: `tests/components/experience.test.tsx`
- Test: `tests/components/live-telemetry.test.tsx`
- Test: `tests/unit/production-contracts.test.ts`

**Interfaces:**

- Consumes: intro phase, scene interaction, queue state, celebration, help, success, page visibility.
- Produces: root `data-motion-paused` and CSS motion tokens.

- [ ] **Step 1: Write failing motion-contract tests**

```ts
it("pauses the whole ambient system while any blocking state is active", async () => {
  render(<MagicCubeExperience />);
  const experience = screen.getByRole("main");
  expect(experience).toHaveAttribute("data-motion-paused", "true");

  await completeIntro();
  expect(experience).toHaveAttribute("data-motion-paused", "false");

  await user.click(screen.getByRole("button", { name: "Ayuda" }));
  expect(experience).toHaveAttribute("data-motion-paused", "true");
});

it("contains no broad transitions or unbounded Three animation", () => {
  expect(experienceStyles).not.toMatch(/transition\\s*:\\s*all/);
  expect(magicCubeSource).not.toContain("autoRotate");
  expect(experienceStyles).toContain(
    '.experience[data-motion-paused="true"]',
  );
});
```

- [ ] **Step 2: Run and verify RED**

```powershell
npm test -- --run tests/components/experience.test.tsx tests/components/live-telemetry.test.tsx tests/unit/production-contracts.test.ts
```

Expected: new root pause assertions fail.

- [ ] **Step 3: Create one root pause decision**

Use page visibility and reduced-motion stores already proven in
`LiveTelemetry.tsx`, extracted into a small shared hook only if duplication is
otherwise necessary. Compute:

```ts
const motionPaused =
  intro.phase !== "ready" ||
  isSceneInteracting ||
  isAnimating ||
  celebrationActive ||
  helpOpen ||
  successOpen ||
  !pageVisible ||
  reducedMotion;
```

Set `data-motion-paused={String(motionPaused)}` on `<main>` and pass it to
telemetry. Do not create an interval.

- [ ] **Step 4: Define motion tokens**

In `globals.css`:

```css
:root {
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --motion-micro: 160ms;
  --motion-state: 260ms;
  --motion-editorial: 420ms;
  --motion-ambient-short: 4.8s;
  --motion-ambient-long: 8.4s;
}
```

Replace abrupt 140/180 ms controls with the closest token while keeping active
press at 120–160 ms.

- [ ] **Step 5: Add restrained ambient animations**

Add these group-level signals:

- spine technical lines: opacity 0.48 → 0.64 → 0.48 over 8.4 s;
- plan drawing: opacity delta no greater than 0.08 over 8.4 s;
- one registration mark: translate/rotate no more than 4 px/4° with a long hold;
- existing piece sweep: retain 4.8 s;
- status dot: scale 1 → 1.16 → 1 with opacity delta 0.18 over 6.4 s;
- CTA sheen: one pass inside an 8.4 s timeline with at least 70% idle;
- dock utility entry: opacity plus translateY(4 px) and scale 0.985 over 220 ms.

Pause every loop:

```css
.experience[data-motion-paused="true"] .pieceMatrix::after,
.experience[data-motion-paused="true"] .statusDot,
.experience[data-motion-paused="true"] .planDrawing,
.experience[data-motion-paused="true"] .cobaltSpine::before,
.experience[data-motion-paused="true"] .cobaltSpine::after,
.experience[data-motion-paused="true"] .purchaseButton::after {
  animation-play-state: paused;
}
```

Add a reduced-motion block that sets all ambient animation names to `none`.
Keep `.moveNumber` completely static.

- [ ] **Step 6: Document the tokens**

Add intro phases, motion durations, ambient periods, cursor modes, and
`indicator-shadow` to `DESIGN.md`. Do not reintroduce dark-theme tokens.

- [ ] **Step 7: Verify Task 6**

```powershell
npm test -- --run tests/components/experience.test.tsx tests/components/live-telemetry.test.tsx tests/unit/production-contracts.test.ts
npm run lint
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit Task 6**

```powershell
git add app/globals.css components/experience/MagicCubeExperience.tsx components/experience/LiveTelemetry.tsx components/experience/experience.module.css DESIGN.md tests/components/experience.test.tsx tests/components/live-telemetry.test.tsx tests/unit/production-contracts.test.ts
git commit -m "refine ambient interface motion"
```

---

### Task 7: Integrate, visually review, and prove production readiness

**Files:**

- Modify: `tests/e2e/helpers.ts`
- Modify: `tests/e2e/experience.spec.ts`
- Modify: `tests/e2e/responsive.spec.ts`
- Modify: `tests/e2e/performance.spec.ts`
- Modify: `README.md`
- Create/update: `.superpowers/sdd/cinematic-motion-report.md`

**Interfaces:**

- Consumes all Tasks 1–6.
- Produces final screenshots, measured performance evidence, review report, clean build, and GitHub-ready branch.

- [ ] **Step 1: Make E2E readiness explicit**

Add:

```ts
export async function waitForIntroReady(page: Page): Promise<void> {
  await expect(page.locator("main#cubo")).toHaveAttribute(
    "data-intro-phase",
    "ready",
    { timeout: 10_000 },
  );
}
```

Call it from `openExperience` after the main shell is visible. Tests that
specifically inspect intro call `page.goto("/")` directly.

- [ ] **Step 2: Add normal and reduced intro E2E**

Normal-motion test at 1440×900:

```ts
await page.emulateMedia({ reducedMotion: "no-preference" });
await page.goto("/");
await expect(page.getByTestId("package-intro")).toBeVisible();
await expect(page.locator("main#cubo")).toHaveAttribute(
  "data-intro-phase",
  "ready",
  { timeout: 4_000 },
);
await expect(page.getByTestId("package-intro")).toHaveCount(0);
await expect(page.locator(".cube-scene canvas")).toBeVisible();
```

Reduced-motion test asserts no package transform animation, no custom cursor,
no `drop` phase exposure, and ready within 500 ms.

- [ ] **Step 3: Add interaction E2E**

Cover:

- left piece drag confirms exactly one move;
- drag continues over another visible cubie and still confirms the initial
  layer;
- left background drag produces byte-identical screenshot;
- right background and right over piece rotate view without movement count;
- contextmenu event is prevented only within `.cube-scene`;
- touch piece/background behavior remains intact;
- ES/PT switch preserves cube and cursor state resets safely.

- [ ] **Step 4: Extend idle draw-call coverage**

Use the existing WebGL counter:

1. wait for intro ready;
2. reset and observe 700 ms → 0;
3. right orbit → draw calls > 0;
4. wait for damping completion, reset and observe 700 ms → 0;
5. left layer turn → draw calls > 0;
6. wait, reset and observe 700 ms → 0.

- [ ] **Step 5: Add responsive and visual assertions**

Capture:

- `cinematic-desktop-1600.png`;
- `cinematic-desktop-1440.png`;
- `cinematic-mobile-390.png`;
- `cinematic-mobile-320.png`;
- one mid-opening desktop frame;
- one mid-drop desktop frame;
- one post-right-orbit frame.

At every final viewport assert no horizontal overflow, H1/CTA/cube/dock fit,
shadow remains under the cube, and mobile has no custom cursor.

- [ ] **Step 6: Run the complete unit and static suite**

```powershell
npm run lint
npm run typecheck
npm test -- --run
git diff --check
```

Expected: zero lint/type/diff errors and all unit/component tests pass.

- [ ] **Step 7: Run production build with automatic Vercel URL**

```powershell
$env:VERCEL='1'
$env:VERCEL_URL='cubo-3-d.vercel.app'
Remove-Item Env:NEXT_PUBLIC_SITE_URL -ErrorAction SilentlyContinue
npm run build
```

Expected: optimized static production build succeeds, including `/_not-found`,
without a custom domain.

- [ ] **Step 8: Run browser and performance suites**

```powershell
npx playwright test tests/e2e/experience.spec.ts tests/e2e/responsive.spec.ts --workers=1
npm run test:performance
```

Expected: all interaction/responsive tests pass; LCP < 2,500 ms, CLS < 0.1,
max interaction < 200 ms, and idle WebGL returns to zero.

- [ ] **Step 9: Perform motion and design review**

Use `review-animations` to review all changed motion code. Block shipment on:

- repeated bounce or rubbery cube deformation;
- perpetual Three.js rendering;
- shadow translation;
- cursor lag or native/custom cursor duplication;
- ambient motion during input;
- keyboard-triggered decorative motion;
- missing reduced-motion behavior.

Run the Impeccable detector once after the last UI change and resolve all
Critical/Important findings. Record advisory decisions in the report.

- [ ] **Step 10: Request independent code review**

Create a review package from the current remote base to HEAD and ask a fresh
reviewer for Critical/Important/Minor findings against:

- the approved spec;
- normal/reduced intro timing;
- pointer ownership;
- right-button orbit;
- static shadow;
- cursor performance;
- ES/PT, touch, keyboard and Vercel behavior.

Fix every Critical/Important finding and re-run its focused test before the
final suite.

- [ ] **Step 11: Update user documentation and report**

README must state:

- left mouse moves layers;
- right mouse rotates the view;
- touch behavior;
- intro/reduced-motion behavior;
- automatic Vercel deployment URL requires no custom domain variable.

The report records exact test counts, draw-call result, LCP, CLS, max
interaction, screenshots, review verdict, and any remaining advisory.

- [ ] **Step 12: Commit and push**

```powershell
git add README.md tests/e2e .superpowers/sdd/cinematic-motion-report.md
git commit -m "test: verify cinematic cube experience"
git push origin main
git ls-remote origin refs/heads/main
```

Expected: remote `main` SHA equals local `HEAD`. Do not run a manual Vercel
deployment; leave the repository ready for the user's Vercel project.
