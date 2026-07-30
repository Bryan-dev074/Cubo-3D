# Reference Alignment and Idle Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the existing cube storefront to match the approved white/cobalt editorial reference while making the Three.js canvas completely static at idle.

**Architecture:** Keep the current Next.js App Router, game reducer, real cubie model, localized dictionaries and WhatsApp flow. Remove the ambient scene loop at the Three.js boundary, then reshape only the presentation layer: layout components, the decorative packaging plan, camera/material settings and responsive CSS. Protect the performance fix with both a source contract and a browser-level pixel-stability assertion.

**Tech Stack:** Next.js 16, React 19, TypeScript, React Three Fiber, Drei, CSS Modules, Vitest, Testing Library, Playwright

## Global Constraints

- The canvas must use `frameloop="demand"` and must not rotate or invalidate itself while idle.
- The commercial surface is light-only and uses a warm white background with cobalt accents.
- All visible product and control copy must remain equivalent in Spanish and Portuguese.
- The cube state, move count, last move, mix progress and completion status must remain truthful.
- Desktop acceptance viewports are 1600×1000 and 1440×900.
- Mobile acceptance viewports are 390×844 and 320×700.
- No horizontal overflow is allowed at any acceptance viewport.

---

### Task 1: Lock the idle-rendering regression

**Files:**
- Modify: `tests/unit/production-contracts.test.ts`
- Modify: `tests/e2e/experience.spec.ts`
- Modify: `components/cube/MagicCube.tsx`
- Modify: `components/cube/CubeScene.tsx`

**Interfaces:**
- Consumes: the existing `CubeScene` canvas and `MagicCube` render group.
- Produces: a demand-rendered scene with no ambient timer or automatic root rotation.

- [ ] **Step 1: Add the failing source contract**

```ts
it("keeps the cube static when the user is idle", () => {
  const magicCubeSource = readFileSync(
    path.join(process.cwd(), "components/cube/MagicCube.tsx"),
    "utf8",
  );
  const sceneSource = readFileSync(
    path.join(process.cwd(), "components/cube/CubeScene.tsx"),
    "utf8",
  );

  expect(magicCubeSource).not.toContain("setInterval");
  expect(magicCubeSource).not.toContain("ambientTurnEnabled");
  expect(sceneSource).toContain('frameloop="demand"');
  expect(sceneSource).toContain("autoRotate={false}");
});
```

- [ ] **Step 2: Run the contract and confirm RED**

Run: `npm test -- tests/unit/production-contracts.test.ts`
Expected: FAIL because `MagicCube.tsx` still contains `setInterval` and `ambientTurnEnabled`.

- [ ] **Step 3: Add the browser-level stability assertion**

```ts
test("the cube canvas is pixel-stable while idle", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(350);

  const before = await canvas.screenshot();
  await page.waitForTimeout(700);
  const after = await canvas.screenshot();

  expect(after.equals(before)).toBe(true);
});
```

- [ ] **Step 4: Remove the ambient loop**

Delete the timer, `ambientTurnEnabled`, idle `useFrame` rotation, orbit/keyboard ambient-state props and duplicate control invalidation. Keep the celebration separation inside `useFrame`, and set `autoRotate={false}` explicitly on `OrbitControls`.

- [ ] **Step 5: Run the focused tests and confirm GREEN**

Run: `npm test -- tests/unit/production-contracts.test.ts`
Expected: PASS.

Run: `npm run test:e2e -- tests/e2e/experience.spec.ts --grep "pixel-stable"`
Expected: PASS with identical canvas buffers.

### Task 2: Establish the white editorial shell

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Modify: `components/experience/MagicCubeExperience.tsx`
- Modify: `components/experience/ExperienceHeader.tsx`
- Modify: `components/experience/HeroCopy.tsx`
- Modify: `components/experience/experience.module.css`
- Modify: `lib/i18n/dictionaries.ts`
- Modify: `tests/components/experience.test.tsx`
- Modify: `tests/e2e/responsive.spec.ts`

**Interfaces:**
- Consumes: `Dictionary`, `PurchaseLink`, `LanguageSwitch`, current experience callbacks.
- Produces: a light-only shell with the expanded editorial spine, reference-scale hero and localized supporting copy.

- [ ] **Step 1: Replace dark-theme expectations with a failing light-only contract**

```ts
it("keeps the commercial surface light regardless of system color scheme", () => {
  expect(globalCss).toContain("color-scheme: light");
  expect(globalCss).not.toContain("prefers-color-scheme: dark");
  expect(globalCss).toMatch(/background:\s*#f[7-9]f[7-9]f[6-9]/i);
});
```

- [ ] **Step 2: Run the component test and confirm RED**

Run: `npm test -- tests/components/experience.test.tsx`
Expected: FAIL because the current CSS still declares dark mode and a blue-gray page background.

- [ ] **Step 3: Implement the shell and localized copy**

Set a single light theme color in `app/layout.tsx`; set `color-scheme: light` and a warm white page surface in `app/globals.css`; expose “CUBO 3D” in the header; add the editorial spine content and move the drag hint below the hero CTA. Add equivalent ES/PT strings for the spine and revised hero description.

- [ ] **Step 4: Implement reference proportions**

Use a ~9.6vw desktop spine capped near 154px, a ~96px header, a three-column workspace, an 80–96px display title and a compact bottom dock. Disable every automatic dark-mode override.

- [ ] **Step 5: Run component and responsive tests**

Run: `npm test -- tests/components/experience.test.tsx tests/unit/i18n.test.ts`
Expected: PASS.

Run: `npm run test:e2e -- tests/e2e/responsive.spec.ts`
Expected: PASS at desktop and mobile viewports with no horizontal overflow.

### Task 3: Reframe and refine the physical cube

**Files:**
- Modify: `components/cube/CubeScene.tsx`
- Modify: `components/cube/MagicCube.tsx`
- Modify: `components/cube/cube-materials.ts`
- Modify: `public/cube-poster.svg`
- Test: `tests/unit/production-contracts.test.ts`

**Interfaces:**
- Consumes: `sceneBudget`, cube state, existing gesture and move-queue hooks.
- Produces: a smaller, fully visible, grounded cube with softer materials and a mobile-safe camera.

- [ ] **Step 1: Add failing material and camera contracts**

```ts
expect(sceneSource).toContain("mobileCameraPosition");
expect(materialSource).toMatch(/roughness:\s*0\.[4-6]/);
expect(materialSource).toMatch(/clearcoat:\s*0\.[01]/);
```

- [ ] **Step 2: Run the focused contract and confirm RED**

Run: `npm test -- tests/unit/production-contracts.test.ts`
Expected: FAIL because the scene has one shared camera and the stickers are too glossy.

- [ ] **Step 3: Implement framing, materials and light**

Select a farther camera for mobile and desktop, reduce cubie gaps, increase sticker roughness, lower clearcoat and replace hard directional lighting with a softer studio arrangement. Keep contact shadows precomputed with `frames={1}`.

- [ ] **Step 4: Match the loading poster**

Change the poster background to the same warm white and soften the poster’s plastic/sticker palette so loading does not flash a different visual world.

- [ ] **Step 5: Run the contract**

Run: `npm test -- tests/unit/production-contracts.test.ts tests/components/cube-canvas.test.tsx`
Expected: PASS.

### Task 4: Build the packaging-plan composition and diagrammatic telemetry

**Files:**
- Modify: `components/experience/MagicCubeExperience.tsx`
- Modify: `components/experience/ControlDock.tsx`
- Modify: `components/experience/LiveTelemetry.tsx`
- Modify: `components/experience/experience.module.css`
- Modify: `tests/components/live-telemetry.test.tsx`

**Interfaces:**
- Consumes: `CubeTelemetry`, `lastMove`, `moveCount`, `mixProgress`, localized labels.
- Produces: a wide packaging dieline, truthful animated instruments and a compact floating action dock.

- [ ] **Step 1: Add a failing semantic telemetry assertion**

```ts
expect(screen.getByTestId("layer-diagram")).toBeInTheDocument();
expect(screen.getByTestId("turn-dial")).toBeInTheDocument();
expect(screen.getByTestId("mix-meter")).toHaveAttribute(
  "aria-valuenow",
  String(telemetry.mixProgress),
);
```

- [ ] **Step 2: Run the telemetry test and confirm RED**

Run: `npm test -- tests/components/live-telemetry.test.tsx`
Expected: FAIL because the diagram and dial hooks do not exist.

- [ ] **Step 3: Implement the visual instruments**

Add semantic wrappers for the layer diagram, 90° dial and mix meter while retaining real telemetry values. Replace 26 simultaneous infinite dot animations with one restrained matrix sweep and state transitions.

- [ ] **Step 4: Implement the wide plan and compact dock**

Render the decorative plan behind the hero and stage, including cut lines, folds, tabs, cube mark, product label and dot matrix. Place the dock at the bottom center on desktop and return it to normal flow on mobile.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- tests/components/live-telemetry.test.tsx tests/components/experience.test.tsx`
Expected: PASS.

### Task 5: Verify the whole experience and publish

**Files:**
- Modify only if verification exposes a defect in an in-scope file.

**Interfaces:**
- Consumes: all deliverables from Tasks 1–4.
- Produces: verified screenshots, passing production gates and a pushed `main` branch.

- [ ] **Step 1: Run static and unit gates**

Run: `npm run lint`
Expected: exit code 0.

Run: `npm run typecheck`
Expected: exit code 0.

Run: `npm test -- --run`
Expected: all tests pass.

- [ ] **Step 2: Run the production build**

Run: `$env:VERCEL='1'; $env:VERCEL_URL='cubo-3-d.vercel.app'; npm run build`
Expected: exit code 0 without requiring `NEXT_PUBLIC_SITE_URL`.

- [ ] **Step 3: Run browser verification**

Run: `npm run test:e2e -- tests/e2e/experience.spec.ts tests/e2e/responsive.spec.ts tests/e2e/performance.spec.ts`
Expected: all tests pass, including idle pixel stability.

- [ ] **Step 4: Capture and inspect final viewports**

Capture 1600×1000, 1440×900, 390×844 and 320×700. Confirm the cube is fully visible, the surface is white, the desktop composition follows the reference, controls do not collide and no horizontal scrollbar exists.

- [ ] **Step 5: Run the design and animation reviews**

Run the Impeccable detector once against all changed UI files and review motion against the project animation standards. Expected: no critical or important findings.

- [ ] **Step 6: Commit and push**

```bash
git add app components docs lib public tests
git commit -m "feat: align cube experience with approved reference"
git push origin main
```

Expected: the new commit is present on `origin/main`.
