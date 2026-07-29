# Cubo Mágico 3D Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use subagent-driven-development to implement this plan task by task.

**Goal:** Entregar y publicar una landing page bilingüe que permita jugar con un cubo 3×3 real, convierta la resolución en un momento comercial y mantenga la compra por WhatsApp disponible en todo momento.

**Architecture:** Next.js App Router renderiza la estructura semántica y carga una isla cliente para idioma, juego y escena. Un motor puro de matrices enteras conserva las 26 piezas y sus movimientos; React Three Fiber representa ese estado y usa referencias imperativas para gestos y animaciones sin renderizar React en cada frame. La capa comercial, los controles alternativos, la celebración y los fallbacks permanecen en HTML accesible.

**Tech Stack:** Next.js 16.2.12, React 19.2.8, TypeScript, Three.js 0.185.1, React Three Fiber 9.6.1, Drei 10.7.7, Motion 12.43.0, Phosphor Icons 2.1.10, Vitest 4.1.10, Testing Library 16.3.2 y Playwright 1.62.0.

---

## Global Constraints

- La dirección visual obligatoria es **La caja abierta**: copy comercial en el tercio izquierdo, cubo monumental a la derecha, líneas de troquel sutiles y una franja compacta de controles integrada al empaque.
- La composición seleccionada y su origen trazable están documentados en `DESIGN.md`: opción A para jerarquía y escala, con la banda de controles de la opción C.
- Archivo Black se usa para el título y Archivo para cuerpo, controles y microcopy mediante `next/font`.
- La interfaz usa blanco humo frío, grafito y un único acento cobalto. Los seis colores clásicos pertenecen solo al cubo. Debe incluir tema oscuro por `prefers-color-scheme`, contraste reforzado por `prefers-contrast` y superficies sólidas por `prefers-reduced-transparency`.
- No usar degradados morados, neón, glassmorphism, tarjetas genéricas, texto decorativo, precio, stock, reseñas ni especificaciones físicas inventadas.
- El objeto final se construye de forma procedural como 26 piezas. `img2threejs` sirve como metodología visual, no como dependencia de ejecución ni como sustituto del motor lógico.
- El CTA apunta a `https://wa.me/595982064334` sin el signo `+`, usa `encodeURIComponent` y precarga el mensaje correspondiente al idioma activo.
- Español y portugués deben cubrir copy, controles, estados, ayuda, fallbacks, accesibilidad y WhatsApp. El cambio de idioma no reinicia el juego.
- La compra nunca se deshabilita.
- El motor puro no importa React ni Three.js y conserva posición y orientación en enteros.
- La celebración solo se emite después de una mezcla válida, al menos un movimiento confirmado del usuario, cola vacía y estado realmente resuelto.
- No usar `transition: all`. Hover solamente bajo `hover:hover` y `pointer:fine`. Respetar `prefers-reduced-motion`.
- Objetivos táctiles mínimos de 44×44 px, foco visible, un solo H1, `aria-live="polite"` y controles alternativos fuera del canvas.
- Debe funcionar desde 320 px sin overflow horizontal y reservar espacio estable para el canvas.
- La escena se carga solo en cliente, usa geometrías y materiales compartidos, DPR máximo 1.75 móvil y 2 escritorio, sombras 1024 móvil y máximo 2048 escritorio, sin bloom ni profundidad de campo obligatorios.
- La versión final se integra en `main` y se publica en `Bryan-dev074/Cubo-3D`. No se despliega Vercel.

## Exact Commercial Copy

### Español

- `Cubo Mágico 3D`
- `Desordenalo, resolvelo y descubrí por qué este clásico se siente mejor en tus manos.`
- `Desordenar cubo`
- `Comprar cubo`
- `Arrastrá una pieza para girar su capa. Arrastrá el fondo para explorar.`
- `Lo resolviste.`
- `Ahora llevá el desafío a tus manos.`
- `Comprar ahora`
- WhatsApp: `Hola 👋 Quiero comprar el Cubo Mágico 3D 🧩 ¿Podrían confirmarme el precio, la disponibilidad y las opciones de entrega?`

### Português

- `Cubo Mágico 3D`
- `Embaralhe, resolva e descubra por que este clássico fica ainda melhor nas suas mãos.`
- `Embaralhar cubo`
- `Comprar cubo`
- `Arraste uma peça para girar a camada. Arraste o fundo para explorar.`
- `Você conseguiu.`
- `Agora leve o desafio para as suas mãos.`
- `Comprar agora`
- WhatsApp: `Olá 👋 Quero comprar o Cubo Mágico 3D 🧩 Poderiam me confirmar o preço, a disponibilidade e as opções de entrega?`

## Task 1: Scaffold the production foundation and bilingual contract

**Files:**

- Create: `package.json`
- Create: `package-lock.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `playwright.config.ts`
- Create: `next-env.d.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `lib/i18n/types.ts`
- Create: `lib/i18n/dictionaries.ts`
- Create: `lib/i18n/locale.ts`
- Create: `lib/whatsapp.ts`
- Test: `tests/unit/i18n.test.ts`
- Test: `tests/unit/whatsapp.test.ts`

**Interfaces:**

```ts
export type Locale = "es" | "pt";
export type Dictionary = typeof dictionaries.es;
export function detectLocale(stored: string | null, browserLanguages: readonly string[]): Locale;
export function buildWhatsAppUrl(locale: Locale): string;
```

**Steps:**

1. Create the package and test configuration. Pin these development dependencies: TypeScript 7.0.2, ESLint 10.8.0, eslint-config-next 16.2.12, `@types/node` 26.1.2, `@types/react` 19.2.17, `@types/react-dom` 19.2.3, `@vitejs/plugin-react` 6.0.4, jsdom 30.0.1, `@testing-library/jest-dom` 7.0.0, `@testing-library/user-event` 14.6.1 and `vite-tsconfig-paths` 6.1.1.
2. Write failing dictionary parity, locale precedence and exact WhatsApp URL tests.
3. Run `npm test -- tests/unit/i18n.test.ts tests/unit/whatsapp.test.ts` and record the expected missing-module failures.
4. Implement typed dictionaries, locale detection and WhatsApp URL generation.
5. Re-run the focused tests until green.
6. Add a Server Component layout with metadata, Archivo fonts and the static page shell. The heavy client experience remains a child boundary.
7. Add foundational tokens and normalization only; do not build the final hero in this task.
8. Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`.
9. Commit with `feat: scaffold bilingual cubo experience`.

## Task 2: Build the integer cube engine with TDD

**Files:**

- Create: `lib/cube/types.ts`
- Create: `lib/cube/constants.ts`
- Create: `lib/cube/math.ts`
- Create: `lib/cube/state.ts`
- Create: `lib/cube/moves.ts`
- Create: `lib/cube/solved.ts`
- Create: `tests/unit/cube-math.test.ts`
- Create: `tests/unit/cube-state.test.ts`
- Create: `tests/unit/cube-solved.test.ts`

**Interfaces:**

```ts
export type AxisValue = -1 | 0 | 1;
export type Axis = "x" | "y" | "z";
export type QuarterTurn = -1 | 1 | 2;
export type Vec3i = readonly [AxisValue, AxisValue, AxisValue];
export type Mat3i = readonly [number, number, number, number, number, number, number, number, number];
export interface CubieState {
  readonly id: string;
  readonly home: Vec3i;
  readonly position: Vec3i;
  readonly orientation: Mat3i;
}
export interface CubeMove {
  readonly axis: Axis;
  readonly layer: AxisValue;
  readonly turns: QuarterTurn;
}
export function createSolvedCube(): readonly CubieState[];
export function applyMove(cube: readonly CubieState[], move: CubeMove): readonly CubieState[];
export function inverseMove(move: CubeMove): CubeMove;
export function isSolved(cube: readonly CubieState[]): boolean;
```

**Steps:**

1. Write failing tests for 26 unique pieces, absence of `[0,0,0]`, integer positions, move plus inverse, four quarter turns, half turns and central layers.
2. Verify RED with `npm test -- tests/unit/cube-math.test.ts tests/unit/cube-state.test.ts`.
3. Implement integer rotation matrices and immutable move application with one centralized sign convention.
4. Write failing solved-state tests for scrambled state and a face center rotated around its own sticker normal.
5. Verify RED, implement sticker-normal solved detection and re-run GREEN.
6. Add invariants for unique positions, orthonormal integer orientations and determinant `1`.
7. Run the three focused test files, then `npm test`, `npm run typecheck` and `npm run lint`.
8. Commit with `feat: add exact cubo state engine`.

## Task 3: Add deterministic game orchestration, gesture resolution and accessible move controls

**Files:**

- Create: `lib/cube/scramble.ts`
- Create: `lib/cube/notation.ts`
- Create: `lib/cube/gesture.ts`
- Create: `lib/game/reducer.ts`
- Create: `lib/game/selectors.ts`
- Create: `components/experience/FaceControls.tsx`
- Test: `tests/unit/scramble.test.ts`
- Test: `tests/unit/gesture.test.ts`
- Test: `tests/unit/game-reducer.test.ts`
- Test: `tests/components/face-controls.test.tsx`

**Interfaces:**

```ts
export function generateScramble(options?: { readonly length?: number; readonly seed?: number }): readonly CubeMove[];
export function resolveLayerGesture(input: GestureProjectionInput): CubeMove | null;
export function gameReducer(state: GameState, action: GameAction): GameState;
export function shouldCelebrate(state: GameState): boolean;
```

**Steps:**

1. Write failing tests for a 20-move deterministic scramble, configurable 18 to 22 length, no repeated face, no immediate inverse, no consecutive same axis and a non-solved result.
2. Verify RED, then implement a seeded generator and notation table.
3. Write failing synthetic-projection tests that choose each tangent axis, layer and sign, including the 8 px dead zone.
4. Verify RED, then implement pure gesture resolution without browser or Three.js dependencies.
5. Write failing reducer tests for queue, confirmed moves, undo, reset, scramble lifecycle and celebration guards.
6. Verify RED, implement reducer and selectors, and keep transient animation values outside state.
7. Write component tests for visible natural-language face and inverse controls, localized names and disabled animation state while purchase remains unaffected. Dimension checks belong to Playwright because jsdom does not calculate layout.
8. Implement `FaceControls` as an expandable HTML control group with visible localized labels such as `Derecha horario` and `Direita anti-horário`; notation can appear only as secondary help. Use Phosphor icons only where a familiar symbol exists.
9. Run focused tests, then `npm test`, `npm run typecheck` and `npm run lint`.
10. Commit with `feat: add cubo game controls and gestures`.

## Task 4: Render and manipulate the premium 3D cube

**Files:**

- Create: `components/cube/CubeCanvas.tsx`
- Create: `components/cube/CubeScene.tsx`
- Create: `components/cube/MagicCube.tsx`
- Create: `components/cube/Cubie.tsx`
- Create: `components/cube/useLayerGesture.ts`
- Create: `components/cube/useMoveQueue.ts`
- Create: `components/cube/cube-materials.ts`
- Create: `components/cube/SceneErrorBoundary.tsx`
- Create: `components/cube/SceneFallback.tsx`
- Create: `components/cube/CubeLoadingPoster.tsx`
- Create: `public/cube-poster.svg`
- Test: `tests/components/scene-fallback.test.tsx`
- Test: `tests/components/cube-canvas.test.tsx`

**Steps:**

1. Write failing component tests for loading poster, localized WebGL failure, retry and preserved purchase link.
2. Verify RED, then implement the fallback boundary and dynamic client-only canvas.
3. Build 26 procedural cubies from the pure state. Use shared rounded geometry and shared satin materials; give stickers separate rounded geometry and derive visible colors from home coordinates plus orientation.
4. Create a grounded studio scene with soft key and fill lights, contact shadow, adaptive DPR and adaptive shadow size. Add a very slow ambient turn only while idle; stop it during pointer interaction, keyboard interaction, page invisibility, reduced motion and celebration. Do not add bloom or depth of field.
5. Animate queued quarter turns via refs and `useFrame`; commit the pure move only after the visual angle snaps to its target. Do not update React state every frame.
6. Implement pointer capture and visual feedback from `pointerdown`. Resolve the intended layer with the pure gesture module, preview it and commit or cancel on release based on distance and velocity.
7. Configure orbiting only from the background with pan and zoom disabled, vertical limits and moderate damping. Suspend orbit during a layer gesture.
8. Add invalidation so an idle scene does not render continuously, while gestures, orbit and springs continue to animate.
9. Add reduced-motion behavior, resource cleanup and a short disabled-state contract for concurrent controls. Detect WebGL through an exported environment function before mounting R3F, and let tests inject that function. Unit tests force both true and false; Playwright forces false by overriding canvas context before navigation.
10. Wrap the dynamically loaded scene in `SceneErrorBoundary`. Test it deterministically with a child that throws once, asserting the localized explanation, poster, working WhatsApp CTA and retry path before confirming that retry remounts the child successfully.
11. Run focused component tests, `npm test`, `npm run typecheck`, `npm run lint` and `npm run build`.
12. Commit with `feat: render interactive premium cubo`.

## Task 5: Build the complete commercial experience and resolution moment

**Files:**

- Create: `components/experience/MagicCubeExperience.tsx`
- Create: `components/experience/ExperienceHeader.tsx`
- Create: `components/experience/HeroCopy.tsx`
- Create: `components/experience/ControlDock.tsx`
- Create: `components/experience/HelpDialog.tsx`
- Create: `components/experience/SuccessMoment.tsx`
- Create: `components/experience/LanguageSwitch.tsx`
- Create: `components/experience/PurchaseLink.tsx`
- Create: `components/experience/experience.module.css`
- Create: `components/experience/useLocale.ts`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Test: `tests/components/experience.test.tsx`
- Test: `tests/components/help-dialog.test.tsx`
- Test: `tests/components/success-moment.test.tsx`

**Direction Contract to place near `app/page.tsx`:**

```text
THESIS: A premium cube package opens into the play surface and makes the product itself the sales argument.
OWN-WORLD: Die-cut folds, registration marks, satin graphite plastic and compact printed controls belong specifically to product packaging and this cube.
STORY: See the product, accept the scramble, learn direct manipulation, solve it, then carry the challenge into your hands through WhatsApp.
FIRST VIEWPORT: One H1, promise, scramble action, monumental playable cube and purchase CTA remain visible without decorative detours.
FORM: Modular toy packaging, concept seed fed89b21 candidate 6, staged as a wide desktop carton and single-column mobile fold.
```

**Steps:**

1. Write failing component tests for initial locale precedence, manual persistence, `lang` updates, exact ES/PT copy, state preservation on switch and localized WhatsApp links.
2. Verify RED, then implement the locale hook and the full semantic experience shell.
3. Reproduce the selected composition: left commercial hierarchy, oversized right cube, header purchase action, subtle fold lines and integrated control dock. Keep the product as the only multicolor element.
4. Write failing help-dialog tests for localized content, focus entry, Escape, close and focus restoration.
5. Verify RED, implement the accessible dialog and compact first-use hint.
6. Write failing success and status-announcer tests for the exact guard conditions, localized message, `Comprar ahora` link, last confirmed move, scramble completion, reset and scene error.
7. Verify RED, implement the success overlay and connect a restrained cube separation and 700 to 900 ms light sweep. Reduced motion uses color and opacity only.
8. Ensure every control uses explicit transitions, press feedback, visible focus and fine-pointer-only hover. Use one `aria-live="polite"` announcer for last confirmed move, scramble completion, reset, scene error and resolution without duplicating speech.
9. Add responsive rules for notebook, 390×844 and 320×700, including a safe-area-aware purchase action that never covers the canvas controls. Add system dark theme, `prefers-contrast: more` and `prefers-reduced-transparency` treatments, each covered by focused style or browser assertions.
10. Run focused tests, `npm test`, `npm run typecheck`, `npm run lint` and `npm run build`.
11. Commit with `feat: complete bilingual cubo sales experience`.

## Task 6: Verify the full story, optimize assets and publish production documentation

**Files:**

- Create: `app/icon.svg`
- Create: `app/opengraph-image.tsx`
- Create: `app/robots.ts`
- Create: `app/sitemap.ts`
- Create: `README.md`
- Create: `tests/e2e/experience.spec.ts`
- Create: `tests/e2e/responsive.spec.ts`
- Create: `tests/e2e/performance.spec.ts`
- Modify: `DESIGN.md`
- Create: `.impeccable/design.json`
- Modify: `package.json`

**Steps:**

1. Refine and reuse the vector poster created with the scene so it matches the final rendered cube, then add metadata assets. Keep the poster light and without third-party branding.
2. Add metadata, OG image, robots and sitemap with a configurable production origin that defaults safely for local build.
3. Write Playwright coverage for desktop, 390×844 and 320×700: first viewport, ES/PT, WhatsApp URL, keyboard, scramble, move, undo, reset, orbit, layer gesture, deterministic WebGL absence via a pre-navigation canvas override and no horizontal overflow. Use `boundingBox` assertions for every primary touch target to verify at least 44×44 px.
4. Capture deterministic light and dark screenshots from the solved initial state with reduced motion enabled and a fixed camera. Review them manually against the portable composition contract in `DESIGN.md`, record the reviewed files as Playwright artifacts and remove any element that does not serve product, challenge or purchase.
5. Run animation review against Emil's rules and fix all high-confidence issues.
6. Run web-interface and React best-practice reviews, then fix critical and important findings.
7. Run the Impeccable detector once against changed UI targets. Update `DESIGN.md` from the implemented tokens and components, and write `.impeccable/design.json`.
8. Add a Chromium performance test that observes largest contentful paint, cumulative layout shift and Event Timing duration during the scripted interaction path. Assert LCP below 2500 ms, CLS below 0.1 and maximum observed interaction duration below 200 ms on the local production server; document that these are lab gates and Vercel field data should be monitored after deployment.
9. Audit production bundle and ensure Three.js remains outside the initial server-rendered shell.
10. Document setup, scripts, controls, architecture, accessibility, test commands, the performance-gate limits and Vercel deployment in `README.md`.
11. Run the complete gate fresh: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run test:performance` and `npm run build`.
12. Commit with `chore: verify and document production experience`.

## Final Integration

1. Generate a full branch review package from the implementation base to `HEAD`.
2. Dispatch a senior whole-branch review against this plan, the design specification, `PRODUCT.md`, `DESIGN.md` and the selected composition contract recorded there.
3. Fix every Critical and Important finding in one reviewed fix wave and re-run its covering tests.
4. Run the complete gate again and inspect `git diff --check`, `git status` and recent commits.
5. Merge `feature/interactive-cube` into `main` locally.
6. Re-run the complete gate on `main`.
7. Push `main` to `https://github.com/Bryan-dev074/Cubo-3D.git`.
8. Verify the remote `main` SHA matches local `main`.
