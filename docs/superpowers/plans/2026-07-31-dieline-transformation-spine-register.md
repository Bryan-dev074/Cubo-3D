# Dieline Transformation and Spine Register Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat package loader with a two-second dimensional dieline that becomes the live interface, then animate every visible part of the cobalt spine through one restrained register-print cycle.

**Architecture:** Keep the existing `sealed → opening → reveal/drop → ready` state machine and WebGL drop contract. Enrich the decorative intro and spine DOM with stable semantic test hooks, then let CSS own all predetermined motion using a single 1350 ms opening clock and a single 6.4 s spine clock. Playwright samples authored checkpoints and a full ambient cycle; Vitest locks structure, pause, reduced-motion, responsive, and performance constraints.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, CSS Modules, Vitest + Testing Library, Playwright, React Three Fiber with `frameloop="demand"`.

## Global Constraints

- Normal intro duration remains exactly `1350 ms + 650 ms = 2000 ms`.
- Reduced-motion intro is an opacity-only transition of at most `180 ms` and has no infinite animation.
- Preserve `sealed → opening → reveal → drop → ready`, the visible-time watchdog, `Escape`/`Tab` skip, and late-scene fallback.
- Do not add an animation dependency, React timer loop, `setInterval`, Three.js ambient loop, or cube autorotation.
- Package surfaces must expose exterior, interior, edge, hinge, destination, and a stable centered contact shadow.
- At `1100 ms` no opaque package surface may cover the title; at `1350 ms` no package surface may remain in front of the live interface.
- The cube originates in the central aperture, starts at most `12%` above desktop final position (`8–9%` mobile), tilts at most `3°`, and settles once.
- Ground shadow center never translates; only scale and opacity may change.
- Every visible desktop spine object participates in a `6.4 s` top-to-bottom register cycle; text displacement is at most `3 px` and rests near 80% of the cycle.
- Pause package motion while the page is hidden and pause ambient spine motion during intro, cube interaction, queued turns, celebration, help, success, hidden page, and reduced motion.
- Mobile keeps spine contents hidden but gives the `0.42rem` top rail a `420 ms` pulse every `4.8 s`; no horizontal overflow at `320 px`.
- Preserve ES/PT localization, WhatsApp purchase URL, left-empty-stage orbit, layer gesture ownership, responsive controls, Vercel build without a custom domain, and `Canvas frameloop="demand"`.
- Motion uses `transform`, `opacity`, and SVG stroke progress; routine exit curve is `cubic-bezier(.23,1,.32,1)` and connected spatial transformations use `cubic-bezier(.77,0,.175,1)`.

---

## File Structure

- `components/experience/PackageIntro.tsx`: decorative package anatomy and stable destination/face hooks only; no clocks.
- `components/experience/MagicCubeExperience.tsx`: localized cobalt-spine anatomy and inline phase indices only.
- `components/experience/experience.module.css`: package perspective, interface continuity, spine director, pause/reduced-motion/mobile rules.
- `tests/components/package-intro.test.tsx`: package DOM, completion-name, finite-state and accessibility contract.
- `tests/components/experience.test.tsx`: spine structure and static CSS contract.
- `tests/e2e/intro.spec.ts`: deterministic intro checkpoints, visibility pause, reduced motion, and final handoff.
- `tests/e2e/spine-motion.spec.ts`: full-cycle filmstrip measurements, pause/resume, reduced motion, and mobile rail behavior.
- `package.json`: include the spine-motion story in the normal E2E command.
- `docs/verification/dieline-spine-release.md`: final commands, artifacts, viewport results, and motion-review verdict.

---

### Task 1: Give the package a dimensional, destination-aware anatomy

**Files:**
- Modify: `components/experience/PackageIntro.tsx:15-146`
- Modify: `tests/components/package-intro.test.tsx:20-58`

**Interfaces:**
- Consumes: existing `PackageIntroProps`, `IntroPhase`, `intro-package-finish`, and `package-intro-reduced`.
- Produces: `data-destination`, `package-ground-shadow`, two `package-flap-face` nodes per panel, `package-flap-edge`, `package-seal-half`, and `package-origin` for CSS and E2E.

- [ ] **Step 1: Write the failing package anatomy test**

Replace the first test body with assertions equivalent to:

```tsx
it("renders a dimensional package whose panels name their live destinations", () => {
  render(
    <PackageIntro
      phase="opening"
      reducedMotion={false}
      onPackageOpened={vi.fn()}
    />,
  );

  expect(screen.getByTestId("package-intro")).toHaveAttribute("aria-hidden", "true");
  expect(screen.getByTestId("package-ground-shadow")).toBeInTheDocument();
  expect(screen.getByTestId("package-origin")).toBeInTheDocument();
  expect(screen.getAllByTestId("package-intro-flap").map((panel) => [
    panel.getAttribute("data-flap"),
    panel.getAttribute("data-destination"),
  ])).toEqual([
    ["top", "header"],
    ["right", "telemetry"],
    ["bottom", "dock"],
    ["left", "hero"],
  ]);
  expect(screen.getAllByTestId("package-flap-face")).toHaveLength(8);
  expect(screen.getAllByTestId("package-flap-face").map((face) => face.getAttribute("data-face")))
    .toEqual(["outer", "inner", "outer", "inner", "outer", "inner", "outer", "inner"]);
  expect(screen.getAllByTestId("package-flap-edge")).toHaveLength(4);
  expect(screen.getAllByTestId("package-hinge")).toHaveLength(4);
  expect(screen.getAllByTestId("package-seal-half").map((half) => half.getAttribute("data-side")))
    .toEqual(["start", "end"]);
});
```

- [ ] **Step 2: Run the focal test and verify RED**

Run: `npm test -- tests/components/package-intro.test.tsx -t "dimensional package"`

Expected: FAIL because `package-ground-shadow`, `package-origin`, face layers, destinations, and seal halves do not exist.

- [ ] **Step 3: Implement the package anatomy without changing the phase clock**

Use one metadata table and render two real faces inside every panel:

```tsx
const PANELS = [
  { flap: "top", destination: "header" },
  { flap: "right", destination: "telemetry" },
  { flap: "bottom", destination: "dock" },
  { flap: "left", destination: "hero" },
] as const;

// Inside packageIntroTimeline, before packageShell:
<span className={styles.packageGroundShadow} data-testid="package-ground-shadow" />

// Inside packageShell:
<div className={styles.packageOrigin} data-testid="package-origin" />
{PANELS.map(({ flap, destination }) => (
  <Fragment key={flap}>
    <span className={styles.packageHinge} data-hinge={flap} data-testid="package-hinge" />
    <div
      className={styles.packageFlap}
      data-destination={destination}
      data-flap={flap}
      data-testid="package-intro-flap"
    >
      <span className={styles.packageFlapFace} data-face="outer" data-testid="package-flap-face">
        <span className={styles.packageFlapPrint}>CUBO / 03</span>
      </span>
      <span className={styles.packageFlapFace} data-face="inner" data-testid="package-flap-face" />
      <i className={styles.packageFlapEdge} data-testid="package-flap-edge" />
    </div>
  </Fragment>
))}
<div className={styles.packageSeal} data-testid="package-seal">
  <span className={styles.packageSealHalf} data-side="start" data-testid="package-seal-half" />
  <span className={styles.packageSealCopy}>CUBO 3D<small>PRECISION OBJECT</small></span>
  <span className={styles.packageSealHalf} data-side="end" data-testid="package-seal-half" />
</div>
```

Keep the existing completion-animation listener unchanged.

- [ ] **Step 4: Run package and intro-state tests**

Run: `npm test -- tests/components/package-intro.test.tsx tests/unit/intro-sequence.test.ts`

Expected: PASS with the existing completion, skip, visibility, sparse-frame, reduced-motion, and StrictMode cases intact.

- [ ] **Step 5: Commit the package anatomy**

```powershell
git add components/experience/PackageIntro.tsx tests/components/package-intro.test.tsx
git commit -m "feat: model destination-aware package panels"
```

---

### Task 2: Author the two-second package-to-interface transformation

**Files:**
- Modify: `components/experience/experience.module.css:46-840`
- Modify: `components/experience/experience.module.css:1320-1400`
- Modify: `components/experience/experience.module.css:2968-3012`
- Modify: `components/experience/experience.module.css:3084-3205`
- Modify: `tests/components/experience.test.tsx:1171-1197`
- Modify: `tests/e2e/intro.spec.ts`

**Interfaces:**
- Consumes: Task 1 package hooks and the existing `data-intro-phase` root attribute.
- Produces: a 1350 ms finite package timeline, destination transforms, opaque-to-open aperture mask, centered shadow, exact final handoff, and checkpoint probe data.

- [ ] **Step 1: Replace the static CSS contract test with the new transformation contract**

```tsx
it("turns the dimensional package into the live regions without a global early reveal", () => {
  const css = readFileSync(
    resolve(process.cwd(), "components/experience/experience.module.css"),
    "utf8",
  );

  expect(css).toContain("animation: intro-package-finish 1350ms linear forwards");
  for (const destination of ["header", "telemetry", "dock", "hero"]) {
    expect(css).toContain(`[data-destination="${destination}"]`);
  }
  expect(css).toMatch(/\.packageGroundShadow\s*\{[^}]*translateX\(-50%\)/);
  expect(css).toMatch(/@keyframes package-ground-settle[\s\S]*?scaleX\(/);
  expect(css).toMatch(/@keyframes package-ground-settle[\s\S]*?opacity:/);
  expect(css.match(/@keyframes package-ground-settle[\s\S]*?\n\}/)?.[0])
    .not.toContain("translateY(");
  expect(css).toMatch(/\.packageFlapFace\[data-face="inner"\]/);
  expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?package-intro-reduced 180ms/);
});
```

- [ ] **Step 2: Rewrite the Playwright checkpoint expectations before CSS**

Keep the current deterministic animation-time helper, but make `readMechanicalCheckpoint` return `packageShadow`, `panelDestinations`, `opaquePanelSamples`, `titleCoverage`, and `cubeRect`. Assert:

```ts
expect(at160.packageShadow.opacity).toBeGreaterThan(0.08);
expect(at450.panels.some((panel) => panel.hasDepth && panel.opacity > 0.9)).toBe(true);
expect(new Set(at650.panels.map((panel) => panel.transform)).size).toBe(4);
expect(at900.panelDestinations).toEqual(["header", "telemetry", "dock", "hero"]);
expect(at1100.titleCoverage).toBeLessThanOrEqual(0.01);
expect(at1100.opaquePanelSamples).toBe(0);
expect(at1350.timelineOpacity).toBeLessThanOrEqual(0.01);
expect(at1760.cubeRect.left).toBeGreaterThanOrEqual(at1760.stageRect.left);
expect(at1760.cubeRect.right).toBeLessThanOrEqual(at1760.stageRect.right);
expect(at2000.phase).toBe("ready");
```

Capture the exact files `dieline-160.png`, `dieline-450.png`, `dieline-650.png`, `dieline-900.png`, `dieline-1100.png`, `dieline-1350.png`, `dieline-1760.png`, and `dieline-2000.png` under `.superpowers/sdd/`.

- [ ] **Step 3: Run the component contract and one checkpoint story to verify RED**

Run: `npm test -- tests/components/experience.test.tsx -t "turns the dimensional package"`

Run: `npx playwright test tests/e2e/intro.spec.ts -g "mechanical checkpoints" --workers=1`

Expected: component FAIL on missing destination/shadow choreography and E2E FAIL at the first new perceptual assertion.

- [ ] **Step 4: Replace the flat package styling with a compact perspective object**

Implement these base invariants, then define complete per-panel positions for all four `data-flap` values:

```css
.packageIntro { perspective: 1500px; background: transparent; }
.packageIntroTimeline {
  width: min(58vw, 42rem);
  aspect-ratio: 1.08;
  transform: rotateX(7deg) rotateZ(-1.2deg);
  transform-style: preserve-3d;
}
.packageShell {
  inset: 14% 12%;
  border: 0;
  box-shadow: none;
  transform-style: preserve-3d;
}
.packageGroundShadow {
  position: absolute;
  top: 76%;
  left: 50%;
  width: 68%;
  height: 13%;
  background: radial-gradient(ellipse, rgba(32,38,42,.25), transparent 72%);
  filter: blur(.55rem);
  opacity: .12;
  transform: translateX(-50%) scaleX(1);
  transform-origin: center;
}
.packageFlapFace { position: absolute; inset: 0; backface-visibility: hidden; }
.packageFlapFace[data-face="outer"] { background: linear-gradient(145deg,#fff,#e9edef); transform: translateZ(2px); }
.packageFlapFace[data-face="inner"] { background: linear-gradient(145deg,#edf2f7,#d8e1eb); transform: translateZ(-2px) rotateY(180deg); }
.packageFlapEdge { box-shadow: inset 0 0 0 1px rgba(32,38,42,.62); transform: translateZ(3px); }
```

Use trapezoidal `clip-path` geometry and transform origins on the aperture edges. At `300–720 ms`, rotate panels between `82°` and `96°`; at `600–1230 ms`, combine rotation with viewport-relative translation toward their named destination. Use only the approved curves. Keep the package backing opaque until the aperture is physically open, then reveal only through the aperture before the destination surfaces become transparent.

- [ ] **Step 5: Align actual interface entrances with their source panels**

Use the same clock and direction for both sides of every handoff:

```css
.experience[data-intro-phase="opening"] .cobaltSpine { animation: interface-spine-enter 330ms var(--ease-out) 860ms both; }
.experience[data-intro-phase="opening"] .header { animation: interface-header-enter 300ms var(--ease-out) 900ms both; }
.experience[data-intro-phase="opening"] .workspace { animation: interface-stage-enter 360ms var(--ease-out) 940ms both; }
.experience[data-intro-phase="opening"] .telemetry { animation: interface-telemetry-enter 300ms var(--ease-out) 970ms both; }
.experience[data-intro-phase="opening"] .controlDock { animation: interface-dock-enter 280ms var(--ease-out) 1010ms both; }
```

The matching package surfaces must be transparent or outside the corresponding live region before its content reaches `opacity: 1`.

- [ ] **Step 6: Refine the real cube arrival and fixed-center shadow**

Keep the drop state and duration. Ensure the CSS cube wrapper uses the existing drop transform while `.groundShadow` never contains `translateY`; update `cube-shadow-drop` to one firm contact with no second rebound. Desktop begins at most `12%` above final position and mobile at most `9%`.

- [ ] **Step 7: Implement responsive and reduced-motion variants**

At `max-width: 900px`, use a roughly `90vw` portrait package, reduce travel rather than duration, keep panels in viewport, and map the cobalt band to the top rail. At `prefers-reduced-motion: reduce`, disable all flap/destination/shadow spatial animations and retain only `package-intro-reduced 180ms` opacity.

- [ ] **Step 8: Run focal verification and inspect all eight screenshots**

Run:

```powershell
npm test -- tests/components/package-intro.test.tsx tests/components/experience.test.tsx tests/unit/intro-sequence.test.ts
npx playwright test tests/e2e/intro.spec.ts --workers=1
npm run typecheck
```

Expected: all commands PASS; screenshots show depth at 450/650 ms, an uncovered title at 1100 ms, no overlay at 1350 ms, contained cube at 1760 ms, and exact final composition at 2000 ms.

- [ ] **Step 9: Commit the transformation**

```powershell
git add components/experience/experience.module.css tests/components/experience.test.tsx tests/e2e/intro.spec.ts
git commit -m "feat: transform the package into the live interface"
```

---

### Task 3: Give every cobalt-spine object an address in the motion director

**Files:**
- Modify: `components/experience/MagicCubeExperience.tsx:320-351`
- Modify: `tests/components/experience.test.tsx:515-534`

**Interfaces:**
- Consumes: localized `dictionary.spine*` strings and an `aria-hidden` decorative aside.
- Produces: `[data-spine-motion]` nodes, six indexed visible wordmark glyphs, four indexed footer lines, two rules, one inspection beam, and three SVG drawing layers.

- [ ] **Step 1: Write the failing spine anatomy test**

```tsx
it("addresses every visible spine object for one top-to-bottom print cycle", () => {
  render(<MagicCubeExperience />);
  const spine = screen.getByTestId("editorial-spine");

  expect(within(spine).getAllByTestId("spine-glyph")).toHaveLength(6);
  expect(within(spine).getAllByTestId("spine-footer-line")).toHaveLength(3);
  expect(within(spine).getAllByTestId("spine-rule")).toHaveLength(2);
  expect(within(spine).getByTestId("spine-inspection-beam")).toBeInTheDocument();
  expect(within(spine).getAllByTestId("spine-diagram-layer").map((layer) => layer.getAttribute("data-layer")))
    .toEqual(["base", "risers", "faces"]);
  expect(spine.querySelectorAll('[data-spine-motion="true"]')).toHaveLength(18);
});
```

- [ ] **Step 2: Run the focal test and verify RED**

Run: `npm test -- tests/components/experience.test.tsx -t "addresses every visible spine"`

Expected: FAIL because the current spine is static text and ungrouped SVG paths.

- [ ] **Step 3: Implement indexed, localized spine markup**

Define `const SPINE_WORDMARK = Array.from("CUBO3D");` outside the component. Render:

```tsx
<span aria-hidden="true" className={styles.spineInspectionBeam} data-spine-motion="true" data-testid="spine-inspection-beam" />
<div className={styles.spineIntro}>
  <strong className={styles.spineIntroTitle} data-spine-motion="true">{dictionary.spineTitle}</strong>
  <span className={styles.spineIntroTagline} data-spine-motion="true">{dictionary.spineTagline}</span>
  <i aria-hidden="true" className={styles.spineRule} data-spine-motion="true" data-testid="spine-rule" />
</div>
<strong aria-hidden="true" className={styles.spineWordmark}>
  {SPINE_WORDMARK.map((glyph, index) => (
    <span
      className={styles.spineGlyph}
      data-spine-motion="true"
      data-testid="spine-glyph"
      key={`${glyph}-${index}`}
      style={{ "--spine-index": index } as CSSProperties}
    >
      {glyph}
    </span>
  ))}
</strong>
```

Give the fifth glyph a `data-word-break="true"` hook so CSS preserves the visual gap between `O` and `3`. The footer has its own `spineRule`; the product label participates at index `0`, and its three ordinary lines receive indices `1..3`, `data-spine-motion="true"`, and `data-testid="spine-footer-line"`. Split the SVG into exactly three `<g>` elements with `data-layer="base|risers|faces"`, `data-spine-motion="true"`, and `data-testid="spine-diagram-layer"`.

- [ ] **Step 4: Run the component suite and locale assertions**

Run: `npm test -- tests/components/experience.test.tsx`

Expected: PASS including Spanish/Portuguese spine copy and all previous interaction/pause tests.

- [ ] **Step 5: Commit the spine anatomy**

```powershell
git add components/experience/MagicCubeExperience.tsx tests/components/experience.test.tsx
git commit -m "feat: address every editorial spine element"
```

---

### Task 4: Implement and prove the 6.4-second register-print director

**Files:**
- Modify: `components/experience/experience.module.css:869-986`
- Modify: `components/experience/experience.module.css:1806-1825`
- Modify: `components/experience/experience.module.css:2671-2696`
- Modify: `components/experience/experience.module.css:3084-3148`
- Modify: `tests/components/experience.test.tsx:955-1110`
- Create: `tests/e2e/spine-motion.spec.ts`
- Modify: `package.json:8`

**Interfaces:**
- Consumes: Task 3 `[data-spine-motion]` nodes and root `data-motion-paused`/`data-intro-phase`/`data-page-visible`.
- Produces: one top-to-bottom desktop cycle, one mobile rail pulse, deterministic filmstrip metrics, and full pause/reduced-motion shutdown.

- [ ] **Step 1: Write the failing static motion-director contract**

```tsx
it("runs every spine group from one 6.4 second register director", () => {
  const css = readFileSync(resolve(process.cwd(), "components/experience/experience.module.css"), "utf8");
  expect(css).toContain("--ambient-spine-register: 6.4s");
  for (const name of [
    "spine-beam-pass", "spine-title-register", "spine-tagline-register",
    "spine-rule-print", "spine-glyph-print", "spine-footer-register",
    "spine-diagram-draw", "spine-arc-register", "spine-mobile-rail",
  ]) expect(css).toContain(`@keyframes ${name}`);
  expect(css).toMatch(/\[data-motion-paused="true"\][\s\S]*?\[data-spine-motion="true"\][\s\S]*?animation-play-state:\s*paused\s*!important/);
  expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\[data-spine-motion="true"\][\s\S]*?animation-name:\s*none\s*!important/);
});
```

- [ ] **Step 2: Create the failing Playwright spine story**

In `spine-motion.spec.ts`, skip the intro with `Escape`, record bounding boxes, opacity, transform, animation name, duration, and play state for every `[data-spine-motion="true"]` every `200 ms` for `7 s`, and capture `spine-filmstrip-0000.png` through `spine-filmstrip-7000.png` at one-second intervals. Assert:

```ts
expect(samples.every((sample) => sample.minimumTextOpacity >= 0.78)).toBe(true);
expect(samples.every((sample) => sample.maximumTextTravel <= 3.1)).toBe(true);
for (let second = 0; second < 7; second += 1) {
  expect(samples.slice(second * 5, second * 5 + 5).some((sample) => sample.changedNodes > 0)).toBe(true);
}
expect(await page.locator('[data-testid="spine-glyph"]').evaluateAll(
  (nodes) => nodes.every((node) => getComputedStyle(node).animationDuration === "6.4s"),
)).toBe(true);
```

Add stories proving: interaction changes all motion nodes to `paused`; release resumes them; reduced motion yields zero infinite animations; at `390×844` children are hidden and the rail has `spine-mobile-rail 4.8s` without overflow.

- [ ] **Step 3: Run the static test and Playwright story to verify RED**

Run:

```powershell
npm test -- tests/components/experience.test.tsx -t "register director"
npx playwright test tests/e2e/spine-motion.spec.ts --workers=1
```

Expected: FAIL because the master token/keyframes/story do not exist.

- [ ] **Step 4: Implement the single-clock CSS director**

Add `--ambient-spine-register: 6.4s` to `.experience`. Every moving spine node uses that duration with `linear infinite`; authored keyframe holds provide the rests. Use the approved timeline:

```css
.spineInspectionBeam { animation: spine-beam-pass var(--ambient-spine-register) linear infinite; }
.spineIntroTitle { animation: spine-title-register var(--ambient-spine-register) linear infinite; }
.spineIntroTagline { animation: spine-tagline-register var(--ambient-spine-register) linear infinite; }
.spineRule { animation: spine-rule-print var(--ambient-spine-register) linear infinite; transform-origin: left; }
.spineGlyph { animation: spine-glyph-print var(--ambient-spine-register) linear infinite; animation-delay: calc(var(--spine-index) * 210ms); }
.spineFooter > [data-spine-motion="true"] { animation: spine-footer-register var(--ambient-spine-register) linear infinite; animation-delay: calc(var(--spine-index, 0) * 145ms); }
.spineDiagram [data-spine-motion="true"] { animation: spine-diagram-draw var(--ambient-spine-register) linear infinite; }
```

Keyframes keep opacity at rest for most of the cycle and place active windows in this order: arcs/beam `0–550 ms`, title `300–950`, tagline/rule `620–1280`, glyphs `1180–3150`, footer rule/text `3000–4550`, diagram `4450–5600`, lower arc `5450–6150`, settle `6150–6400`. Glyph travel is `-2 px`, scale peak `1.02`, ordinary text travel is no more than `3 px`, and no text disappears.

- [ ] **Step 5: Extend pause, reduced motion, short viewport, and mobile rail rules**

```css
.experience[data-motion-paused="true"] .cobaltSpine [data-spine-motion="true"] {
  animation-play-state: paused !important;
}
@media (max-width: 900px) {
  .experience[data-intro-phase="ready"] .cobaltSpine {
    animation: spine-mobile-rail 4.8s linear infinite;
  }
}
@media (max-height: 720px) and (min-width: 901px) {
  .cobaltSpine { --spine-travel-scale: .7; }
}
@media (prefers-reduced-motion: reduce) {
  .cobaltSpine,
  .cobaltSpine [data-spine-motion="true"] { animation-name: none !important; }
}
```

Ensure the root mobile rail animation is paused only in `ready` ambient state, so it cannot freeze the finite `interface-spine-enter` animation during opening.

- [ ] **Step 6: Add the story to the normal E2E command**

Set:

```json
"test:e2e": "playwright test tests/e2e/intro.spec.ts tests/e2e/experience.spec.ts tests/e2e/responsive.spec.ts tests/e2e/spine-motion.spec.ts"
```

- [ ] **Step 7: Run focal suites and inspect the filmstrip**

Run:

```powershell
npm test -- tests/components/experience.test.tsx
npx playwright test tests/e2e/spine-motion.spec.ts --workers=1
npm run lint
npm run typecheck
```

Expected: PASS; the seven screenshots show one coherent top-to-bottom scan, readable resting text, sequential wordmark printing, footer handoff, and layered SVG assembly.

- [ ] **Step 8: Commit the spine director**

```powershell
git add components/experience/experience.module.css tests/components/experience.test.tsx tests/e2e/spine-motion.spec.ts package.json
git commit -m "feat: animate the full cobalt spine register cycle"
```

---

### Task 5: Release gate, perceptual review, and publication

**Files:**
- Create: `docs/verification/dieline-spine-release.md`

**Interfaces:**
- Consumes: all prior tasks and their screenshot artifacts.
- Produces: reproducible verification evidence and a published `origin/main` matching local `HEAD`.

- [ ] **Step 1: Run the complete local gate from a clean production build**

```powershell
npm test
npm run lint
npm run typecheck
Remove-Item Env:NEXT_PUBLIC_SITE_URL -ErrorAction SilentlyContinue
npm run build
npm run test:e2e
npm run test:performance
git diff --check
```

Expected: every command exits `0`; the build succeeds without `NEXT_PUBLIC_SITE_URL`.

- [ ] **Step 2: Perform the required animation review**

Review against the saved intro checkpoints and spine filmstrip. Record exactly:

```markdown
| Before | After | Why |
| --- | --- | --- |
| Flat suspended card | Supported dimensional dieline | Establishes volume and a physical origin |
| White panels over loaded UI | Surfaces hand off to matching live regions | Makes the box become the interface |
| Cube falls from outside the composition | Cube releases from the central aperture | Connects product arrival to the package |
| Only side arcs move | One 6.4 s top-to-bottom register cycle | Gives every spine object purposeful life |

Verdict: PASS
```

Do not record `PASS` if any 1100 ms panel covers the title, any text travels more than `3 px`, reduced motion has an infinite animation, or mobile overflows.

- [ ] **Step 3: Record verification evidence**

Create `docs/verification/dieline-spine-release.md` with commit range, command results, viewport table (`1600×1000`, `1440×900`, `390×844`, `320×568`, `844×390`), screenshot filenames, accessibility/reduced-motion result, performance result, animation table, and final verdict.

- [ ] **Step 4: Commit release evidence**

```powershell
git add docs/verification/dieline-spine-release.md
git commit -m "docs: record dieline and spine release verification"
```

- [ ] **Step 5: Push the verified main branch**

```powershell
git push origin main
git rev-parse HEAD
git ls-remote origin refs/heads/main
git status --short
```

Expected: local and remote hashes match and status is clean.
