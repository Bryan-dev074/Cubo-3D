# Kinetic Print and Gesture Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock every layer gesture to its first valid axis/layer and transform the approved white editorial experience into a continuously alive kinetic-print composition with a mechanical two-second package intro.

**Architecture:** Keep cube mathematics and the demand-driven Three.js scene unchanged. Add the gesture latch inside `useLayerGesture`, a focused semantic `PlotterTitle` DOM component, richer package-intro structure, and one CSS-driven ambient motion system controlled by the existing `data-motion-paused` state. All ambient motion uses compositor-only transforms and opacity.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, React Three Fiber, CSS Modules, Vitest/Testing Library, Playwright.

## Global Constraints

- Normal intro is exactly `1350 ms` package opening plus `650 ms` cube entry, with a visible maximum of `2000 ms`.
- Reduced motion uses a `180 ms` crossfade and no spatial movement.
- Keep `Canvas frameloop="demand"` and `OrbitControls autoRotate={false}`.
- Add no animation dependency, `setInterval`, ambient React loop, or ambient `useFrame`.
- Left pointer manipulates a layer when the drag starts on a cubie, but orbits the whole cube when the drag starts on empty stage space; right pointer also orbits.
- Pointer ownership is fixed at `pointerdown`: crossing between empty space and a cubie never transfers the active gesture.
- After the first non-null move, `{ axis, layer }`, owner cue, and cursor axis remain fixed until release/cancel; only `turns` may invert.
- Ambient motion pauses during intro, cube interaction, queued moves, celebration, dialogs, hidden page, and reduced motion.
- Preserve Spanish/Portuguese, WhatsApp purchase links, white/cobalt/graphite palette, fixed-centered shadow, responsive targets, and Vercel compatibility.

---

### Task 1: Latch the selected cube layer

**Files:**
- Modify: `components/cube/useLayerGesture.ts`
- Modify: `components/cube/CubeScene.tsx`
- Modify: `tests/components/layer-gesture.test.tsx`
- Modify: `tests/components/cube-canvas.test.tsx`
- Modify: `tests/e2e/experience.spec.ts`

**Interfaces:**
- Consumes: existing `ProjectedCandidate`, `resolveLayerGesture`, `LayerVisualPreview`, and cursor-intent helpers.
- Produces: `ActiveGesture.lockedCandidate: ProjectedCandidate | null` and a release path that never searches outside that candidate after latching.
- Produces: OrbitControls mapping in which `LEFT` and `RIGHT` orbit only when a layer gesture did not claim the originating pointer.

- [ ] **Step 1: Write the failing component test**

Add a test that starts on cubie `1:1:1`, moves far enough horizontally to lock one candidate, then moves in an L-shaped vertical trajectory over a foreign cubie before release. Capture preview move, selected IDs, cursor intents, and committed move:

```tsx
expect(firstResolvedMove).not.toBeNull();
expect(lShapePreview.move).toMatchObject({
  axis: firstResolvedMove!.axis,
  layer: firstResolvedMove!.layer,
});
expect(lShapePreview.selectedIds).toEqual(new Set([owner.id]));
expect(lastDragIntent).toBe(cursorIntentForMove(lShapePreview.move!));
expect(onMoveRequest).toHaveBeenCalledWith(
  expect.objectContaining({
    axis: firstResolvedMove!.axis,
    layer: firstResolvedMove!.layer,
  }),
);
```

- [ ] **Step 2: Run the focal test and verify RED**

Run: `npm test -- tests/components/layer-gesture.test.tsx`

Expected: FAIL because the second trajectory re-resolves against all candidates and because `selectedIds` expands to the full layer.

- [ ] **Step 3: Implement candidate latching and owner-only cue**

Extend the active gesture and resolve through one helper:

```ts
interface ActiveGesture {
  // existing fields
  lockedCandidate: ProjectedCandidate | null;
}

function resolveGestureMove(
  gesture: ActiveGesture,
  drag: Vector2,
): CubeMove | null {
  const candidates = gesture.lockedCandidate
    ? [gesture.lockedCandidate]
    : gesture.candidates;
  const move = resolveLayerGesture({ drag: [drag.x, drag.y], candidates });
  if (move && !gesture.lockedCandidate) {
    gesture.lockedCandidate = gesture.candidates.find(
      (candidate) =>
        candidate.axis === move.axis && candidate.layer === move.layer,
    ) ?? null;
  }
  return move;
}
```

Initialize `lockedCandidate: null`, use `resolveGestureMove` in move and release handlers, and keep `selectedIds: new Set([gesture.cubie.id])` while previewing. Preserve `EMPTY_SELECTION` only after committing the physical move.

- [ ] **Step 4: Add a non-collinear Playwright regression**

In the cube interaction test, send `pointerdown`, then `+54,+4`, then `+10,+100`, assert the cursor's `data-axis` does not change, release, and assert telemetry reports the originally locked layer rather than the second trajectory's layer.

Add two ownership stories: a left drag beginning on an empty canvas coordinate changes camera orientation without changing move telemetry, while a left drag beginning on a cubie changes the layer without also orbiting the camera. Crossing over the opposite surface during either held drag must not transfer ownership. Keep right-drag orbit coverage.

- [ ] **Step 5: Run focal tests and commit**

Run:

```powershell
npm test -- tests/components/layer-gesture.test.tsx tests/components/cube-interaction.test.ts
npx playwright test tests/e2e/experience.spec.ts --grep "locks.*layer|L-shaped"
```

Expected: all focal tests PASS.

Commit: `fix: lock cube layer gesture ownership`

---

### Task 2: Build the semantic plotter title

**Files:**
- Create: `components/experience/PlotterTitle.tsx`
- Create: `tests/components/plotter-title.test.tsx`
- Modify: `components/experience/HeroCopy.tsx`
- Modify: `components/experience/experience.module.css`
- Modify: `tests/components/experience.test.tsx`

**Interfaces:**
- Consumes: localized `dictionary.title` and existing `experience-title` heading ID.
- Produces: `PlotterTitle({ title, id })`, one semantic `h1`, exactly two stable visual lines, and decorative glyph layers.

- [ ] **Step 1: Write RED tests for semantics and line structure**

```tsx
render(<PlotterTitle id="experience-title" title="Cubo Mágico 3D" />);
expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
expect(screen.getByRole("heading", { name: "Cubo Mágico 3D" })).toBeVisible();
expect(screen.getByTestId("plotter-title")).toHaveAttribute(
  "aria-label",
  "Cubo Mágico 3D",
);
expect(screen.getAllByTestId("plotter-line")).toHaveLength(2);
expect(screen.getAllByTestId("plotter-glyph").length).toBeGreaterThan(10);
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/components/plotter-title.test.tsx`

Expected: FAIL because `PlotterTitle` does not exist.

- [ ] **Step 3: Implement the component without timers**

```tsx
export function PlotterTitle({ id, title }: PlotterTitleProps) {
  const [first = title, ...rest] = title.trim().split(/\s+/u);
  const lines = [first, rest.join(" ")];
  let glyphIndex = 0;

  return (
    <h1 aria-label={title} className={styles.plotterTitle} id={id}
      data-testid="plotter-title">
      {lines.map((line, lineIndex) => (
        <span aria-hidden="true" className={styles.plotterLine}
          data-testid="plotter-line" key={`${lineIndex}-${line}`}>
          <span className={styles.plotterBase}>{line}</span>
          <span className={styles.plotterInk}>
            {Array.from(line).map((glyph) => {
              const index = glyphIndex++;
              return <span className={styles.plotterGlyph}
                data-testid="plotter-glyph" key={`${index}-${glyph}`}
                style={{ "--glyph-index": index } as React.CSSProperties}>{glyph}</span>;
            })}
          </span>
          <span className={styles.plotterRegister} />
        </span>
      ))}
    </h1>
  );
}
```

The CSS uses an always-visible low-contrast base, a solid ink layer, and a cobalt registration block. The 10.8-second cycle begins after a 6.4-second initial hold, staggers glyph opacity/transform and moves the register block only with transform/opacity, and is disabled by `data-motion-paused`/reduced-motion.

- [ ] **Step 4: Replace the old hero `h1` and prove the CSS contract**

Update `HeroCopy` to render `<PlotterTitle id="experience-title" title={dictionary.title} />`. Add source-contract assertions for `10.8s`, `6.4s`, `aria-hidden`, stable two-line markup, and pause selectors.

- [ ] **Step 5: Run tests and commit**

Run: `npm test -- tests/components/plotter-title.test.tsx tests/components/experience.test.tsx`

Expected: PASS.

Commit: `feat: add kinetic plotter headline`

---

### Task 3: Rebuild the two-second mechanical package intro

**Files:**
- Modify: `components/experience/PackageIntro.tsx`
- Modify: `components/experience/experience.module.css`
- Modify: `tests/components/package-intro.test.tsx`
- Modify: `tests/e2e/intro.spec.ts`

**Interfaces:**
- Consumes: unchanged `IntroPhase`, `onPackageOpened`, and existing visible-time watchdog.
- Produces: testable package parts for shell, inner face, hinge, closing rails, serial, registration marks, four flaps, aperture, and seal.

- [ ] **Step 1: Write RED structure and intermediate-state tests**

```tsx
expect(screen.getByTestId("package-shell")).toBeInTheDocument();
expect(screen.getByTestId("package-inner-face")).toBeInTheDocument();
expect(screen.getAllByTestId("package-hinge")).toHaveLength(4);
expect(screen.getAllByTestId("package-rail")).toHaveLength(2);
expect(screen.getByTestId("package-serial")).toHaveTextContent("CM3D");
expect(screen.getByTestId("package-aperture")).toBeInTheDocument();
```

Extend the E2E midpoint probe to assert that at `160 ms` registration/seal are engaged, at `650 ms` flaps have distinct transforms and the central aperture exposes the real interface, and at `1350 ms` the package overlay no longer masks the stage.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/components/package-intro.test.tsx`

Expected: FAIL because the mechanical parts are absent.

- [ ] **Step 3: Add meaningful package DOM**

Inside the shared timeline, render a `packageShell` containing exterior and inner faces, two closure rails, four hinges paired to flaps, technical microcopy/serial, registration corners, an aperture, then the existing seal and spine. Keep all content `aria-hidden` and non-interactive.

```tsx
<div className={styles.packageShell} data-testid="package-shell">
  <div className={styles.packageInnerFace} data-testid="package-inner-face" />
  <div className={styles.packageAperture} data-testid="package-aperture" />
  {RAILS.map((rail) => <span className={styles.packageRail}
    data-rail={rail} data-testid="package-rail" key={rail} />)}
  {FLAPS.map((flap) => <Fragment key={flap}>
    <span className={styles.packageHinge} data-hinge={flap}
      data-testid="package-hinge" />
    <div className={styles.packageFlap} data-flap={flap}
      data-testid="package-intro-flap"><span>CUBO / 03</span></div>
  </Fragment>)}
</div>
```

- [ ] **Step 4: Implement the approved 0–2000 ms visual choreography**

Use the existing 1350 ms package animation clock: registration `0–160`, rails `140–360`, flaps `320–980` with 45–60 ms stagger, aperture/interface reveal `650–1350`. Keep the actual cube drop in the existing 650 ms `drop` phase with no more than 5 degrees tilt and one settle. Overlay backgrounds fade to transparent and pointer events become none during reveal/drop. Reduced motion keeps the current 180 ms crossfade.

- [ ] **Step 5: Run intro tests and commit**

Run:

```powershell
npm test -- tests/components/package-intro.test.tsx tests/unit/intro-sequence.test.ts
npx playwright test tests/e2e/intro.spec.ts
```

Expected: all intro tests PASS at 1440, 900, 390, and 320 widths.

Commit: `feat: create mechanical package reveal`

---

### Task 4: Coordinate the ambient motion director and anchored cube

**Files:**
- Modify: `components/experience/MagicCubeExperience.tsx`
- Modify: `components/experience/experience.module.css`
- Modify: `components/experience/ControlDock.tsx`
- Modify: `components/experience/LiveTelemetry.tsx`
- Modify: `tests/components/experience.test.tsx`
- Modify: `tests/components/live-telemetry.test.tsx`
- Modify: `tests/unit/production-contracts.test.ts`

**Interfaces:**
- Consumes: existing `motionPaused`, `data-motion-paused`, telemetry snapshot, `isSceneInteracting`, and CSS module regions.
- Produces: staggered CSS ambient loops across plan, registration, spine, title, telemetry, dock, CTA, hero mark, and cube wrapper.

- [ ] **Step 1: Write RED contract tests**

Assert that every approved ambient selector is present in the shared pause selector, that each duration appears (`10.8s`, `8.4s`, `6.4s`, `7.2s`, `4.8s`, `3.2s`, `5.4s`), that no `setInterval`/new `useFrame`/`autoRotate={true}` exists, and that the cube float selector targets `.cubeFrame` while `.groundShadow` has no translated ambient keyframe.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- tests/components/experience.test.tsx tests/unit/production-contracts.test.ts`

Expected: FAIL for the new title, dock, hero-mark, microfloat, and complete pause contracts.

- [ ] **Step 3: Implement one staggered CSS director**

Declare named timing variables on `.experience`, apply offset loops to the existing regions, and add pseudo-elements only where a scan line or sheen is meaningful. Keep no more than two high-contrast cues active on desktop and one on mobile by using long inactive portions and negative phase offsets. Add every ambient selector to:

```css
.experience[data-motion-paused="true"] .plotterGlyph,
.experience[data-motion-paused="true"] .plotterRegister,
.experience[data-motion-paused="true"] .planDrawing,
.experience[data-motion-paused="true"] .planRegistrationMotion,
.experience[data-motion-paused="true"] .cobaltSpine::before,
.experience[data-motion-paused="true"] .cobaltSpine::after,
.experience[data-motion-paused="true"] .pieceMatrix::after,
.experience[data-motion-paused="true"] .statusDot,
.experience[data-motion-paused="true"] .dock::after,
.experience[data-motion-paused="true"] .purchaseButton::after,
.experience[data-motion-paused="true"] .heroRule::after,
.experience[data-motion-paused="true"] .cubeFrame {
  animation-play-state: paused !important;
}
```

- [ ] **Step 4: Add microfloat without moving the shadow**

Animate only `.cubeFrame` up to `translateY(-2px)` over `6.4s`; keep `.groundShadow` outside the wrapper and animate only opacity/scale around its fixed `translate(-50%, -50%)` anchor. Pause microfloat for `data-motion-paused`, `:hover` on fine pointers, `:focus-within`, and active stage interaction. Reduce to 1 px or disable on mobile.

- [ ] **Step 5: Preserve truthful data changes**

Use data attributes/classes solely to animate a telemetry value when its real value changes. Idle sweeps may cross the matrix/frame but never mutate or substitute values. Keep button/icon loops off frequent controls.

- [ ] **Step 6: Run focal tests and commit**

Run:

```powershell
npm test -- tests/components/experience.test.tsx tests/components/live-telemetry.test.tsx tests/unit/production-contracts.test.ts
```

Expected: PASS.

Commit: `feat: coordinate ambient print motion`

---

### Task 5: Responsive, accessibility, visual, performance, and release gate

**Files:**
- Modify: `tests/e2e/responsive.spec.ts`
- Modify: `tests/e2e/performance.spec.ts`
- Modify: `tests/e2e/intro.spec.ts`
- Modify: `tests/e2e/experience.spec.ts`
- Modify: `components/experience/experience.module.css` only for issues proven by the gate.

**Interfaces:**
- Consumes: completed gesture, title, intro, and ambient systems.
- Produces: verified release at desktop, mobile portrait, and mobile landscape with independent interaction and motion reviews.

- [ ] **Step 1: Add end-to-end acceptance checks**

Assert no horizontal overflow at `1440×900`, `1600×1000`, `390×844`, `320×700`, and `844×390`; title remains two lines without clipping; touch targets remain at least 44 px; cube does not overlap telemetry/dock; reduced motion has no running ambient spatial animations; normal motion becomes paused during layer/orbit interactions and resumes after release.

- [ ] **Step 2: Run the complete unit/component suite**

Run: `npm test`

Expected: every Vitest test PASS.

- [ ] **Step 3: Run static and production validation**

Run:

```powershell
npm run lint
npm run typecheck
Remove-Item Env:NEXT_PUBLIC_SITE_URL -ErrorAction SilentlyContinue
npm run build
```

Expected: lint, TypeScript, and the Vercel-compatible Turbopack production build PASS without requiring a custom site URL.

- [ ] **Step 4: Run all browser and performance tests**

Run:

```powershell
npm run test:e2e
npm run test:performance
```

Expected: all browser stories PASS; local LCP `<2500 ms`, CLS `<0.1`, and worst interaction `<200 ms`.

- [ ] **Step 5: Perform independent reviews and visual inspection**

Capture normal intro at registration, mid-opening, reveal, mid-drop, and ready; inspect desktop/mobile/landscape, title mid-write, hover pause, shadow anchoring, and L-shaped gesture. An independent gesture reviewer and independent motion reviewer must each return `PASS`; fix and rerun focal gates until they do.

- [ ] **Step 6: Commit and publish**

Run `git diff --check`, confirm only intended files, commit remaining test/QA fixes as `test: verify kinetic cube experience`, push `main`, then confirm `git rev-parse HEAD` equals `git rev-parse origin/main` and the worktree is clean.
