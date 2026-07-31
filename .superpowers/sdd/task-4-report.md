# Task 4 report - Coordinated ambient motion director

## Status

DONE

- Baseline: `fde0b2075c37f0c9cd9663f3d8a9a4e1a8e806b2` on `main`.
- Implementation commit: `26ed7477554da8f12ce853e0962dea2868dcce06`.
- Scope is limited to the ambient director, its DOM hooks, and its automated/browser contracts.

## Implemented result

- Kept `MagicCubeExperience.shouldPauseAmbientMotion` and the single root
  `data-motion-paused` attribute as the only ambient director. No ambient React
  state, timer, rAF loop, Three.js invalidation, or dependency was added.
- Declared named periods on `.experience` for plotter `10.8s`, plan `8.4s`,
  registration `6.4s`, spine `7.2s`, matrix `4.8s`, status `3.2s`, dock `6.4s`,
  purchase `7.2s`, hero `5.4s`, and cube `6.4s`.
- Coordinated the existing plotter, dieline, registration, cobalt spine,
  matrix, status, purchase sheen, hero mark and the new dock print rail with
  long inactive windows and negative phase offsets.
- Added one mobile-only, `aria-hidden` telemetry summary rail as a direct child
  of the summary. It remains outside the move, state and scramble value wrappers.
- Reused the existing hero registration mark for `.heroRule::after`; no new
  semantic hero or dock content was introduced.
- Added cube microfloat only to the DOM `.cubeFrame`: maximum `-2px` desktop,
  `-1px` at the mobile/tablet layout breakpoint. `.groundShadow` remains its
  sibling and keeps the fixed translate/rotation/scale anchor.
- Paused microfloat through the central director and on fine-pointer stage
  hover, focus-within and active interaction.
- Added every ambient selector explicitly to the central pause list, including
  pseudo-elements, the mobile rail and `.cubeFrame`.
- Preserved the finite `planDrawing` intro by allowing its opening animation to
  run only while `data-page-visible="true"`. Hidden-page pause still wins, and
  ambient motion remains paused until the root reaches the ready state.
- Reduced motion removes every ambient animation name, keeps the title ink
  solid, keeps the mobile spine collapsed, and leaves finite reduced intro and
  success treatments separate.
- Telemetry values are unchanged at idle. Only decorative sweeps/rails move.

## TDD evidence

### RED

Command:

`npm test -- tests/components/experience.test.tsx tests/components/live-telemetry.test.tsx tests/unit/production-contracts.test.ts`

Observed before implementation: 79 total, 75 passed, 4 failed for the expected
missing behavior:

1. named director periods / dock / hero / cube contracts;
2. decorative mobile rail DOM;
3. complete central pause and finite-intro override;
4. complete reduced-motion ambient list.

### GREEN

The same focal command passed: 3 files, 79/79 tests.

Full Vitest verification passed: 36 files, 331/331 tests.

## Browser and rendering evidence

- Help open pauses the root director and plotter; close resumes it.
- A real background orbit pauses the same director on pointer down and resumes
  it on release.
- Forced a running `cube-microfloat` DOM phase, reset the WebGL draw-call
  counter, waited 950 ms, and observed exactly 0 new draw calls.
- Full E2E command passed in one final run: 49/49 tests in 3.2 minutes.
- Actual touch environments passed at 390x844, 320x700 and 844x390.
- Reduced-motion browser contract passed with plotter base hidden, plotter ink
  solid, and cube ambient animation name `none`.

One earlier full E2E run reached 48/49 because the pre-existing mobile shadow
orbit test timed out after five new WebGL contexts had run before it. The test
passed isolated in 56.9 seconds. The new responsive coverage was moved to the
end of its file to preserve historical WebGL ordering; the next full run then
passed 49/49. No timeout threshold or production behavior was weakened.

## Visual review

Reviewed real browser captures:

- `.superpowers/sdd/task-4-desktop-ambient.png`
- `.superpowers/sdd/task-4-mobile-390-ambient.png`
- `.superpowers/sdd/task-4-mobile-320-ambient.png`
- `.superpowers/sdd/task-4-mobile-landscape-ambient.png`

Desktop keeps the editorial split and anchored cube/shadow. At 390 and 320 the
cube, dock and telemetry summary remain separated with no horizontal overflow.
At 844x390 the hero remains usable in the first viewport, while automated scroll
checks prove each primary interaction region fits the viewport when brought
into view.

## Animation self-review

| Before | After | Why |
| --- | --- | --- |
| Partial pause list omitted dock, hero, mobile rail and cube wrapper | One explicit root pause list covers every approved ambient selector | Pause/resume now has one auditable source of truth |
| Existing plan ambient loop conflicted with its finite opening animation | A page-visible opening override runs only the finite plan entry | Preserves intro timing without letting hidden-page or ready-state ambient motion leak |
| Cube had no DOM microfloat contract | `.cubeFrame` moves by 2px/1px; sibling shadow never translates ambiently | Adds depth without touching Three.js or causing WebGL draws |
| Ambient periods reused broad tokens or mismatched the requested active windows | Named periods and restrained active windows match the addendum | Makes cadence intentional and keeps high-contrast cues sparse |
| Reduced motion relied on a shorter ambient list | Every ambient name becomes `none`; title base is hidden | Produces a solid title and no spatial idle movement |

Verdict: **Approve**. Ambient keyframes animate only `transform` and `opacity`,
use custom/linear easing appropriate to the motion, gate hover behavior behind
fine pointers, provide complete reduced-motion handling, and add no high-frequency
button/icon loop.

## Final gates

- `npm test`: PASS - 36 files, 331 tests.
- Focal component/contracts command: PASS - 3 files, 79 tests.
- `npm run test:e2e`: PASS - 49 tests.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `git diff --check`: PASS.
- Browser console/page diagnostics in responsive tests: clean.

## Residual risks

- Ambient screenshots capture one phase of long staggered loops; exact perceived
  cadence still varies by wall-clock phase, though all individual bounds, pause
  states and responsive modes are automated.
- CSS Modules prefixes keyframe names in production. Browser assertions match
  the stable keyframe suffix so they verify the intended animation without
  coupling tests to a generated build hash.

## Review-fix addendum (2026-07-31)

Fix commit: `ae8a4319a93f71954c3b94326b84a4e553528045`

### Findings closed

1. Narrowed `status-breathe` to the requested `44.375% / 50% / 55.625%`
   shape. At the existing `3.2s` period, the complete non-base window is now
   `11.25%`, or exactly `360ms`.
2. Kept all mobile loops alive while capping matrix at `0.12` and
   purchase/hero/summary peaks at `0.10`. Status remains `0.88`; the dock stays
   the sole high-contrast pulse at the known coincidences. Desktop peak values
   remain unchanged through root custom-property defaults.
3. Moved the four ambient viewport stories, sustained cadence story and
   reduced-motion story before the mobile orbit/shadow stress story. Every new
   context source now uses `WEBGL_lose_context` in `finally` before closing its
   browser context. No timeout or assertion was increased, removed or relaxed.
4. The first complete rerun exposed a separate deterministic race in the intro
   visibility test: a `160ms` finite animation advanced between two browser
   evaluations after being reset. Reset and hide now happen atomically in one
   evaluation; its original `140ms` waits and `+40ms` resume assertion are
   unchanged.

### TDD RED

- `npm test -- tests/components/experience.test.tsx tests/unit/production-contracts.test.ts`
  — expected RED: 67/70 passed; the precise 360ms status window, mobile peak
  variables, and WebGL release/order contract were absent.
- `npx playwright test tests/e2e/responsive.spec.ts --grep "mobile sustains at most one high contrast ambient pulse"`
  — expected RED: 0/1; at `40.34s`, two signals exceeded `0.2` (dock
  `0.514889`, hero `0.319783`).
- The initial complete E2E rerun and isolated intro rerun both reproduced the
  reset/hide race at the `package-registration-engage` duration boundary before
  its atomic setup fix.

### GREEN and final gates

- Focal Vitest command above: PASS, 70/70.
- Sustained coincidence E2E at `40.34s`, `213.14s`, `385.94s` and `558.74s`:
  PASS, 1/1; every sample had exactly one opacity above `0.2`, with all sampled
  secondary signals at or below `0.12`.
- Stress-ordered E2E grep covering four ambient viewports, sustained cadence,
  reduced motion, then mobile orbit/shadow: PASS, 7/7 in 2.0 minutes.
- Atomic intro visibility focal E2E: PASS, 1/1 with unchanged assertions.
- `npm test`: PASS, 36 files and 333/333 tests.
- `npm run test:e2e`: PASS, 50/50 in 3.6 minutes.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `git diff --check`: PASS.

The complete E2E run retains the real idle WebGL draw-call proof, director
pause/resume, gesture stories, truthful telemetry/state coverage, fixed-shadow
orbit checks, reduced motion, and responsive layouts. The review fixes add no
React ambient state, timer, rAF loop, Three.js invalidation or dependency.

## Re-review round 2 addendum (2026-07-31)

Fix commit: `456e8f0173ebade2298f1a61f3a2e6b00c31c19c`

### Findings closed

1. The mobile cadence browser probe now includes the maximum computed opacity
   of every plotter glyph and both plotter registration marks. It explicitly
   samples `46.53s`, four genuinely different later phases, and a representative
   `540ms` sweep from `0` through `172.26s` (325 unique samples total).
2. The plotter remains unchanged and alive. The dock rail now uses
   `--ambient-dock-peak-opacity`: desktop stays at `0.72`, while mobile is
   capped at `0.12`, matching the existing low-contrast secondary ceiling.
3. New WebGL-producing stories call one nested cleanup helper. It attempts
   `WEBGL_lose_context` and always executes `context.close()` from an inner
   `finally`, even when page evaluation fails. A real browser failure-path
   story closes the page first, verifies the release error is propagated, and
   verifies the browser context still closes.
4. The stress order remains four ambient viewport stories, cadence, reduced
   motion, cleanup failure, then the real mobile orbit/shadow story. No timeout
   or behavioral assertion was increased, removed or relaxed.

### TDD evidence

- Cadence RED:
  `npx playwright test tests/e2e/responsive.spec.ts --grep "mobile sustains at most one high contrast ambient pulse"`
  failed at exactly `46,530ms`, measuring dock `0.500625` and plotter
  `0.783777` above the `0.2` high-contrast threshold.
- Teardown RED:
  `npm test -- tests/unit/production-contracts.test.ts` failed 1/21 because the
  nested release-and-close helper and failure-path story did not exist.
- CSS contract RED:
  `npm test -- tests/components/experience.test.tsx` failed 1/49 because the
  mobile dock peak variable did not exist.
- Focal GREEN:
  `npm test -- tests/components/experience.test.tsx tests/unit/production-contracts.test.ts`
  passed 70/70.
- Cadence GREEN: the browser sweep passed 1/1; the known collision retains one
  live high-contrast plotter cue, the dock remains alive below `0.12`, and all
  325 samples contain at most one high-contrast cue.
- Cleanup failure path GREEN: passed 1/1 with the release error propagated and
  the browser context close event observed.
- Ordered stress GREEN: passed 8/8 in 1.0 minute, with orbit/shadow last.

### Full gate stabilization and final verification

- The complete gate exposed two pre-existing test races rather than production
  regressions. Mechanical checkpoint screenshots let the real `1350ms`
  watchdog advance by wall clock; the test now uses the existing visibility
  director to keep phase `opening` through checkpoints `160–1100`, then restores
  visibility after checkpoint `1350` and verifies the original `drop/ready`
  contract. The unchanged checkpoint assertions passed 3/3 consecutively.
- Mobile landscape used Playwright `scrollIntoViewIfNeeded()` on the purposely
  microfloating cube scene. Its subpixel rect never met Playwright's stability
  precondition. The geometry-only check now invokes native
  `scrollIntoView({ block: "nearest", inline: "nearest" })` and retains every
  bounding-box assertion; the focal story passed in `18.4s` instead of waiting
  up to the `120s` test limit.
- `npm run test:e2e`: PASS, 51/51 in 2.8 minutes.
- `npm test`: PASS, 36 files and 333/333 tests.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `git diff --check`: PASS.

The final run preserves the single director, finite intro behavior, zero idle
WebGL draws, truthful telemetry, fixed shadow, gestures, responsive layouts and
reduced-motion behavior. No timeout was raised and no production dependency,
React ambient state, timer, rAF loop or Three.js invalidation was added.
