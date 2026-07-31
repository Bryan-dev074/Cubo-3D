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
