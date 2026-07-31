# Task 5 report - Kinetic cube acceptance gate

## Status

IMPLEMENTATION COMPLETE; RELEASE GATES PENDING

The acceptance gate also proved one production defect in the plotter title:
two fixed registration blocks and a broad fade could not produce the approved
single-glyph writing state. The resulting component/CSS correction is limited
to that gate-proven issue. No timeout, threshold, dependency, or performance
test changed.

## Acceptance coverage added

- `responsive.spec.ts` now verifies the plotter title at `1600x1000`,
  `1440x900`, `390x844`, `320x700`, and `844x390`. The shared helper requires
  exactly two semantic visual-line blocks, one rendered text fragment per
  block, both blocks inside the `h1`, all text ink inside the viewport, and no
  clipping overflow on the heading or line containers.
- The existing `44px` visible-target audit now runs in mobile landscape as
  well as both portrait viewports.
- Portrait and landscape explicitly compare both `.cubeFrame` and
  `.cube-scene` against both the control dock and live telemetry. All four
  pairs must remain separate.
- Reduced motion now inspects `document.getAnimations()` and rejects every
  infinite animation whose play state is still `running`; it no longer relies
  only on three named selectors.
- The existing orbit/help director story now proves that CSS is genuinely in
  normal-motion mode by asserting the real plotter animation name. The setup
  emulates `prefers-reduced-motion: no-preference` at the browser media layer,
  in addition to the existing JavaScript compatibility shim.
- A real non-collinear layer drag now proves `data-motion-paused=true` and a
  paused plotter while held, preserves axis and direction at the L endpoint,
  remains paused through release/queue handoff, then returns to
  `data-motion-paused=false` with the plotter running after the queue finishes.
- The mechanical checkpoint story now captures the approved `160ms`
  registration/seal state before advancing to the existing later checkpoints.
- `PlotterTitle` now renders one decorative registration block for the whole
  heading. Its CSS-only transform/opacity path crosses the two stable lines in
  glyph order. Per-glyph `linear()` timing keeps the exact `0–760ms` write,
  `760–9800ms` solid hold, reverse `9800–10160ms` erase, and
  `10160–10800ms` base-only phases. Reduced motion hides the register
  completely.

## TDD evidence

### RED 1 - title geometry calibration

The first nine-story focal run returned `4 passed, 5 failed`. All five target
viewports failed because the initial helper incorrectly required the font ink
rectangle to remain inside the CSS line box. With `line-height: 0.94`, glyph ink
legitimately extends above that box while remaining visible. Failure captures
showed no visual clipping, so CSS was not changed. The helper was narrowed to
the actual contract: line blocks inside the heading, one text fragment per
line, ink inside the viewport, and visible overflow where font metrics extend
beyond the line box.

### RED 2 - false normal-motion positive

After adding a real animation-name assertion, the existing ambient
pause/resume story failed `0/1`:

```text
Expected: /plotter-glyph-cycle$/
Received: "none"
```

The prior helper changed JavaScript `matchMedia` only, while the Playwright
context still applied the reduced-motion CSS media query. Adding
`page.emulateMedia({ reducedMotion: "no-preference" })` before navigation made
the browser and application agree. The same story then passed `1/1`.

### RED 3 - WebGL teardown contract

The first focal Vitest run after adding a separate visual story returned
`85/86`: `production-contracts.test.ts` expected four guarded WebGL context
release sites and observed five. The visual capture logic was moved into the
existing desktop ambient story, preserving the exact teardown assertion and
avoiding another browser context. The unchanged contract then passed.

### RED 4 - real mid-write title state

The independently strengthened motion gate first failed `0/1`. At the common
cycle time every glyph was effectively solid (`0.989149..1`) and both line
registers had opacity `1`; the capture therefore was not mid-write. The new
component test also failed because no single `plotter-register` existed. The
minimal production correction replaces both fixed line registers with one
heading register and narrows the write transition. The component test then
passed `1/1`, and the browser gate passed `1/1` while requiring solid,
partial, and base-only glyphs plus exactly one visible synchronized register.

### RED 5 - full-cycle cadence mismatch

The first independent motion re-review rejected the apparently correct
single-register capture. The production cycle still used `34ms` offsets and
left each ink glyph solid for only about `32.5%` of the period instead of the
specified `>80%`. The strengthened gate now samples real CSS states at
`420ms`, `760ms`, `9000ms`, `9920ms`, and `10400ms`, verifies forward order,
the long solid hold, reverse erase, base-only rest, and derives every solid
duration from rendered timing data. It failed before the production rewrite
and passes with the exact phase model.

### GREEN

- Focal Playwright acceptance run: `10/10` passed in `37.7s` using the external
  server config, without a build. It covered normal-motion help/orbit, the held
  L-shaped layer drag, the `160ms` intro checkpoint, both desktop title/layout
  viewports, desktop ambient captures, reduced motion, landscape, and both
  portrait viewports.
- Focal Vitest: `4 files`, `86/86` passed.
- TypeScript: `npm run typecheck` passed.
- ESLint: `npm run lint` passed.
- Plotter/component/production focal Vitest: `3 files`, `71/71` passed.
- Exact plotter cycle and causal hover capture: `1/1` passed.
- Normal-motion pause/resume plus locked L-shaped gesture: `2/2` passed.
- Mobile high-contrast cadence: `1/1`, all `325` sampled instants passed.
- Working-tree and staged diff checks passed.

Per the task delegation, the full build, performance suite, full Vitest suite,
and full E2E suite were intentionally left for the root release gate.

## Fresh visual evidence

The browser stories regenerated these local QA artifacts without Playwright's
`animations: "disabled"` fast-forwarding:

| State | Artifact | SHA-256 |
| --- | --- | --- |
| Intro registration and seal at `160ms` | `.superpowers/sdd/mechanical-opening-160.png` | `5005472557e121f71abd61635a4e1dfd9a0bcc7b7fb2089c1e91f59a2283986f` |
| Plotter title mid-write | `.superpowers/sdd/task-5-title-mid-write.png` | `a54c1a31892c2a9dd8db90e5f2d8cf1ea9e6cd969eb308fc74f80cd82d07affb` |
| Fine-pointer hover with microfloat paused | `.superpowers/sdd/task-5-hover-paused-microfloat.png` | `e432accf6f574654f9e838ab6a94947499ad244d946c2698afcd4b702fd322b7` |
| L-shaped layer gesture held before release | `.superpowers/sdd/task-5-l-shaped-held-before-release.png` | `a0baf0582abf459c95d7303f442d22624b9be3ab7c3a09659d462400367cd4d6` |

Visual inspection confirmed the title remains readable in the partial-ink
frame with one register following the active glyph, hover freezes a non-zero
cube transform while the fixed shadow stays in place, the package
registration/seal is engaged at `160ms`, and the held L gesture shows the
originally owned layer preview before release.

## Independent reviews

- Gesture: `PASS`. The reviewer confirmed the real `+54,+4 -> +10,+100`
  non-collinear held drag preserves axis, direction, telemetry layer ownership,
  pause through release/queue handoff, and resumes only after the queue ends.
- Motion: `PASS`. The reviewer verified the two stable lines, one register,
  exact forward-write/solid/reverse-erase/base phases, the `-3.4s` initial
  phase that reaches erase `6.4s` after `ready`, transform/opacity-only motion,
  causal hover resume, and the fresh captures with no remaining Critical or
  Important finding.

## Scope and residual release work

- Modified acceptance specs: `tests/e2e/responsive.spec.ts`,
  `tests/e2e/intro.spec.ts`, and `tests/e2e/experience.spec.ts`.
- Gate-proven motion fix: `components/experience/PlotterTitle.tsx`,
  `components/experience/experience.module.css`, and
  `tests/components/plotter-title.test.tsx`.
- `tests/e2e/performance.spec.ts` remains unchanged because the audited gaps do
  not require a new threshold or probe, and performance execution was reserved
  for the root release.
- The root release still owns the complete build, performance run, complete
  browser run, and published-main equality check.
