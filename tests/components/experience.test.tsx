import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  MagicCubeExperience,
  shouldPauseAmbientMotion,
  type AmbientMotionConditions,
} from "@/components/experience/MagicCubeExperience";
import { inverseMove } from "@/lib/cube/moves";
import type { CubeMove } from "@/lib/cube/types";
import type { QueuedMove } from "@/lib/game/reducer";
import type { CursorIntent } from "@/lib/motion/cursor-intent";
import type { IntroPhase } from "@/lib/motion/intro-sequence";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

vi.mock("@/components/experience/AdaptiveCursor", () => ({
  AdaptiveCursor: ({
    intent,
    onMounted,
    paused,
  }: {
    readonly intent: CursorIntent;
    readonly onMounted?: (mounted: boolean) => void;
    readonly paused: boolean;
  }) => (
    <div
      data-axis={intent.axis}
      data-direction={intent.direction}
      data-mode={intent.mode}
      data-paused={String(paused)}
      data-testid="adaptive-cursor-probe"
    >
      <button type="button" onClick={() => onMounted?.(true)}>
        Montar cursor personalizado
      </button>
      <button type="button" onClick={() => onMounted?.(false)}>
        Desmontar cursor personalizado
      </button>
    </div>
  ),
}));

vi.mock("@/components/cube/CubeCanvas", () => ({
  CubeCanvas: ({
    introPhase,
    isCelebrating = false,
    locale,
    onCursorIntentChange,
    onDropComplete,
    onInteractionLockChange,
    onMoveComplete,
    onMoveRequest,
    onSceneError,
    onSceneReady,
    queue,
  }: {
    readonly introPhase?: IntroPhase;
    readonly isCelebrating?: boolean;
    readonly locale: "es" | "pt";
    readonly onCursorIntentChange?: (intent: CursorIntent) => void;
    readonly onDropComplete?: () => void;
    readonly onInteractionLockChange?: (locked: boolean) => void;
    readonly onMoveComplete: () => void;
    readonly onMoveRequest: (move: CubeMove) => void;
    readonly onSceneError?: (reason: "error" | "webgl") => void;
    readonly onSceneReady?: () => void;
    readonly queue: readonly QueuedMove[];
  }) => (
    <div
      data-intro-phase={introPhase}
      data-locale={locale}
      data-testid="cube-canvas-probe"
    >
      <span data-testid="visual-queue-length">{queue.length}</span>
      <span data-testid="visual-queue-json">{JSON.stringify(queue)}</span>
      <button
        type="button"
        onClick={() => onMoveRequest({ axis: "x", layer: 1, turns: 1 })}
      >
        Simular giro
      </button>
      <button
        type="button"
        onClick={() => {
          onMoveRequest({ axis: "x", layer: 1, turns: 1 });
          onMoveRequest({ axis: "y", layer: 1, turns: 1 });
        }}
      >
        Simular doble giro
      </button>
      <button
        disabled={isCelebrating}
        type="button"
        onClick={() => onMoveRequest({ axis: "z", layer: 1, turns: -1 })}
      >
        Simular gesto canvas real
      </button>
      {(["x", "y", "z"] as const).flatMap((axis) =>
        ([-1, 0, 1] as const).flatMap((layer) =>
          ([-1, 1] as const).map((turns) => (
            <button
              key={`${axis}-${layer}-${turns}`}
              data-testid={`request-${axis}-${layer}-${turns}`}
              type="button"
              onClick={() => onMoveRequest({ axis, layer, turns })}
            >
              Solicitar {axis} {layer} {turns}
            </button>
          )),
        ),
      )}
      <button type="button" onClick={onMoveComplete}>
        Confirmar giro visual
      </button>
      <button type="button" onClick={() => onInteractionLockChange?.(true)}>
        Iniciar gesto
      </button>
      <button type="button" onClick={() => onInteractionLockChange?.(false)}>
        Terminar gesto
      </button>
      <button type="button" onClick={() => onSceneError?.("error")}>
        Fallar escena
      </button>
      <button type="button" onClick={onSceneReady}>
        Marcar escena lista
      </button>
      <button type="button" onClick={onDropComplete}>
        Completar caída
      </button>
      <button
        type="button"
        onClick={() =>
          onCursorIntentChange?.({
            axis: "z",
            direction: "negative",
            mode: "layer-drag",
          })
        }
      >
        Emitir cursor de capa
      </button>
      <button
        type="button"
        onClick={() => onCursorIntentChange?.({ mode: "disabled" })}
      >
        Emitir cursor bloqueado
      </button>
    </div>
  ),
}));

const LOCALE_STORAGE_KEY = "cubo3d-locale";

const RESTING_MOTION: AmbientMotionConditions = {
  celebrationActive: false,
  helpOpen: false,
  introReady: true,
  pageVisible: true,
  queueActive: false,
  reducedMotion: false,
  sceneInteracting: false,
  successOpen: false,
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete (document as { visibilityState?: string }).visibilityState;
});

beforeEach(() => {
  window.localStorage.clear();
  setBrowserLanguages(["es-PY"]);
  document.documentElement.lang = "es";
});

describe("MagicCubeExperience locale and commerce", () => {
  it.each([
    ["intro", { introReady: false }],
    ["scene interaction", { sceneInteracting: true }],
    ["queued move", { queueActive: true }],
    ["celebration", { celebrationActive: true }],
    ["help", { helpOpen: true }],
    ["success", { successOpen: true }],
    ["hidden page", { pageVisible: false }],
    ["reduced motion", { reducedMotion: true }],
  ] satisfies readonly (readonly [
    string,
    Partial<AmbientMotionConditions>,
  ])[])("pauses independently for %s and resumes at rest", (_label, blocker) => {
    expect(shouldPauseAmbientMotion(RESTING_MOTION)).toBe(false);
    expect(
      shouldPauseAmbientMotion({ ...RESTING_MOTION, ...blocker }),
    ).toBe(true);
  });

  it("enables native cursor suppression only after the adaptive cursor reports mounted", async () => {
    const user = userEvent.setup();
    const { container, unmount } = render(<MagicCubeExperience />);
    const experience = container.querySelector("main");

    expect(experience).not.toHaveAttribute("data-custom-cursor");
    expect(document.body).not.toHaveAttribute("data-cube-custom-cursor");
    await user.click(
      screen.getByRole("button", { name: "Montar cursor personalizado" }),
    );
    expect(experience).toHaveAttribute("data-custom-cursor", "true");
    expect(document.body).toHaveAttribute("data-cube-custom-cursor", "true");

    await user.click(
      screen.getByRole("button", { name: "Desmontar cursor personalizado" }),
    );
    expect(experience).not.toHaveAttribute("data-custom-cursor");
    expect(document.body).not.toHaveAttribute("data-cube-custom-cursor");

    await user.click(
      screen.getByRole("button", { name: "Montar cursor personalizado" }),
    );
    expect(document.body).toHaveAttribute("data-cube-custom-cursor", "true");
    unmount();
    expect(document.body).not.toHaveAttribute("data-cube-custom-cursor");
  });

  it("pauses the cursor only for the intro and not for an ordinary cube lock", async () => {
    const user = userEvent.setup();
    render(<MagicCubeExperience />);
    const cursor = screen.getByTestId("adaptive-cursor-probe");

    expect(cursor).toHaveAttribute("data-paused", "true");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(cursor).toHaveAttribute("data-paused", "false");

    await user.click(screen.getByRole("button", { name: "Iniciar gesto" }));
    expect(cursor).toHaveAttribute("data-paused", "false");
  });

  it("normalizes cube cursor intent and resets it safely when locale changes", async () => {
    const user = userEvent.setup();
    renderReadyExperience();
    const cursor = screen.getByTestId("adaptive-cursor-probe");

    await user.click(
      screen.getByRole("button", { name: "Emitir cursor de capa" }),
    );
    expect(cursor).toHaveAttribute("data-mode", "layer-drag");
    expect(cursor).toHaveAttribute("data-axis", "z");
    expect(cursor).toHaveAttribute("data-direction", "negative");

    await user.click(screen.getByRole("button", { name: "PT" }));
    expect(cursor).toHaveAttribute("data-mode", "idle");
    expect(cursor).not.toHaveAttribute("data-axis");
    expect(cursor).not.toHaveAttribute("data-direction");
  });

  it("mounts the decorative package intro before the real carton", () => {
    const { container } = render(<MagicCubeExperience />);
    const experience = container.querySelector("main");
    const intro = screen.getByTestId("package-intro");

    expect(experience).toHaveAttribute("data-intro-phase", "opening");
    expect(experience?.firstElementChild).toBe(intro);
    expect(screen.getByTestId("cube-canvas-probe")).toBeInTheDocument();
  });

  it("skips the intro when the WebGL scene reports an error", async () => {
    const user = userEvent.setup();
    const { container } = render(<MagicCubeExperience />);

    expect(container.querySelector("main")).toHaveAttribute(
      "data-intro-phase",
      "opening",
    );
    await user.click(screen.getByRole("button", { name: "Fallar escena" }));

    expect(container.querySelector("main")).toHaveAttribute(
      "data-intro-phase",
      "ready",
    );
    expect(screen.queryByTestId("package-intro")).not.toBeInTheDocument();
  });

  it("blocks every gameplay path through drop while keeping language, help and purchase available", async () => {
    const user = userEvent.setup();
    const { container } = render(<MagicCubeExperience />);

    await user.click(screen.getByRole("button", { name: "Marcar escena lista" }));
    firePackageAnimationEnd();

    expect(container.querySelector("main")).toHaveAttribute(
      "data-intro-phase",
      "drop",
    );
    expect(screen.getByRole("button", { name: "Desordenar cubo" })).toBeDisabled();

    const primaryActions = screen.getByTestId("primary-dock-actions");
    expect(
      within(primaryActions).getByRole("button", { name: "Desordenar" }),
    ).toBeDisabled();
    expect(
      within(primaryActions).getByRole("button", { name: "Reiniciar" }),
    ).toBeDisabled();
    expect(
      within(primaryActions).getByRole("button", { name: "Ayuda" }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "PT" })).toBeEnabled();
    for (const purchase of screen.getAllByRole("link", { name: "Comprar cubo" })) {
      expect(purchase).toHaveAttribute("href", buildWhatsAppUrl("es"));
      expect(purchase).not.toHaveAttribute("aria-disabled", "true");
    }

    await user.click(screen.getByRole("button", { name: "Más controles" }));
    expect(screen.getByRole("button", { name: "Deshacer" })).toBeDisabled();
    const layerToggle = screen.getByRole("button", {
      name: "Mostrar controles por capa",
    });
    expect(layerToggle).toBeEnabled();
    await user.click(layerToggle);
    for (const layerMove of within(
      screen.getByRole("group", { name: "Giros por capa" }),
    ).getAllByRole("button")) {
      expect(layerMove).toBeDisabled();
    }

    await user.click(screen.getByRole("button", { name: "Simular giro" }));
    expect(screen.getByTestId("visual-queue-length")).toHaveTextContent("0");

    await user.click(screen.getByRole("button", { name: "Completar caída" }));
    expect(container.querySelector("main")).toHaveAttribute(
      "data-intro-phase",
      "ready",
    );
    expect(screen.getByRole("button", { name: "Desordenar cubo" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Simular giro" }));
    expect(screen.getByTestId("visual-queue-length")).toHaveTextContent("1");
  });

  it("publishes the current page visibility for coordinated CSS motion", () => {
    let visibilityState: DocumentVisibilityState = "visible";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibilityState,
    });
    const { container } = render(<MagicCubeExperience />);
    const experience = container.querySelector("main");

    expect(experience).toHaveAttribute("data-page-visible", "true");
    expect(experience).toHaveAttribute("data-motion-paused", "true");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(experience).toHaveAttribute("data-motion-paused", "false");

    visibilityState = "hidden";
    fireEvent(document, new Event("visibilitychange"));
    expect(experience).toHaveAttribute("data-page-visible", "false");
    expect(experience).toHaveAttribute("data-motion-paused", "true");

    visibilityState = "visible";
    fireEvent(document, new Event("visibilitychange"));
    expect(experience).toHaveAttribute("data-page-visible", "true");
    expect(experience).toHaveAttribute("data-motion-paused", "false");
  });

  it("publishes one ambient pause signal through intro, scene interaction and resume", async () => {
    const user = userEvent.setup();
    const { container } = render(<MagicCubeExperience />);
    const experience = container.querySelector("main");
    const telemetry = screen.getByTestId("live-telemetry");

    expect(experience).toHaveAttribute("data-motion-paused", "true");
    expect(telemetry).toHaveAttribute("data-motion-paused", "true");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(experience).toHaveAttribute("data-motion-paused", "false");
    expect(telemetry).toHaveAttribute("data-motion-paused", "false");

    await user.click(screen.getByRole("button", { name: "Iniciar gesto" }));
    expect(experience).toHaveAttribute("data-motion-paused", "true");
    expect(telemetry).toHaveAttribute("data-motion-paused", "true");

    await user.click(screen.getByRole("button", { name: "Terminar gesto" }));
    expect(experience).toHaveAttribute("data-motion-paused", "false");
    expect(telemetry).toHaveAttribute("data-motion-paused", "false");
  });

  it("pauses and resumes the ambient system while help is open", async () => {
    const user = userEvent.setup();
    const { container } = renderReadyExperience();
    const experience = container.querySelector("main");

    expect(experience).toHaveAttribute("data-motion-paused", "false");
    await user.click(screen.getByRole("button", { name: "Ayuda" }));
    expect(experience).toHaveAttribute("data-motion-paused", "true");

    await user.click(screen.getByRole("button", { name: "Cerrar ayuda" }));
    expect(experience).toHaveAttribute("data-motion-paused", "false");
  });

  it("keeps ambient motion paused for reduced motion after the intro is skipped and resumes when the preference clears", async () => {
    let reduced = true;
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches:
          query === "(prefers-reduced-motion: reduce)" ? reduced : false,
        media: query,
        addEventListener: (
          type: string,
          listener: (event: MediaQueryListEvent) => void,
        ) => {
          if (query === "(prefers-reduced-motion: reduce)" && type === "change") {
            listeners.add(listener);
          }
        },
        removeEventListener: (
          type: string,
          listener: (event: MediaQueryListEvent) => void,
        ) => {
          if (query === "(prefers-reduced-motion: reduce)" && type === "change") {
            listeners.delete(listener);
          }
        },
      }) as unknown as MediaQueryList),
    );
    const { container } = render(<MagicCubeExperience />);
    const experience = container.querySelector("main");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(experience).toHaveAttribute("data-intro-phase", "ready");
    expect(experience).toHaveAttribute("data-motion-paused", "true");

    reduced = false;
    listeners.forEach((listener) =>
      listener({ matches: false } as MediaQueryListEvent),
    );

    await waitFor(() =>
      expect(experience).toHaveAttribute("data-motion-paused", "false"),
    );
  });

  it("offers a localized skip link to the interactive cube stage", () => {
    render(<MagicCubeExperience />);

    const skipLink = screen.getByRole("link", {
      name: "Ir al cubo interactivo",
    });
    expect(skipLink).toHaveAttribute("href", "#cube-stage");
    expect(
      skipLink.closest('[data-help-dialog-background="true"]'),
    ).not.toBeNull();
    expect(
      screen.getByRole("region", {
        name: "Cubo Mágico 3D interactivo",
      }),
    ).toHaveAttribute("id", "cube-stage");
  });

  it("keeps the product title in exactly two intentional visual lines", () => {
    render(<MagicCubeExperience />);

    const heading = screen.getByRole("heading", {
      level: 1,
      name: "Cubo Mágico 3D",
    });
    const lines = within(heading).getAllByTestId("plotter-line");

    expect(lines).toHaveLength(2);
    expect(within(lines[0]).getByTestId("plotter-base")).toHaveTextContent(
      /^Cubo$/,
    );
    expect(within(lines[1]).getByTestId("plotter-base")).toHaveTextContent(
      /^Mágico 3D$/,
    );
  });

  it("keeps the plotter title semantic while CSS owns its paused motion cycle", () => {
    const titleSource = readFileSync(
      resolve(process.cwd(), "components/experience/PlotterTitle.tsx"),
      "utf8",
    );
    const css = readFileSync(
      resolve(process.cwd(), "components/experience/experience.module.css"),
      "utf8",
    );

    expect(titleSource).toContain('aria-hidden="true"');
    expect(titleSource).toContain('const lines = [first, rest.join(" ")];');
    expect(titleSource).toContain("<h1");
    expect(titleSource).not.toMatch(/setTimeout|requestAnimationFrame/);
    expect(css).toContain("--plotter-cycle: var(--ambient-plotter)");
    expect(css).toContain("--plotter-first-cycle: 6.4s");
    expect(css).toMatch(
      /\.experience\[data-motion-paused="true"\] \.plotterGlyph,[\s\S]*?\.experience\[data-motion-paused="true"\] \.plotterRegister/,
    );
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.plotterGlyph,[\s\S]*?\.plotterRegister,[\s\S]*?\.cubeFrame\s*\{[\s\S]*?animation-name:\s*none\s*!important;/,
    );
  });

  it("renders the CUBO 3D wordmark and localized editorial spine", () => {
    render(<MagicCubeExperience />);

    expect(screen.getByRole("link", { name: "CUBO 3D" })).toHaveAttribute(
      "href",
      "#cubo",
    );

    const spine = screen.getByTestId("editorial-spine");
    expect(spine).toHaveAttribute("aria-hidden", "true");
    expect(spine).not.toHaveAttribute("aria-label");
    expect(within(spine).getByText("LA CAJA ABIERTA")).toBeVisible();
    expect(
      within(spine).getByText("DISEÑO QUE SE DESPLIEGA"),
    ).toBeVisible();
    expect(within(spine).getByText("JUEGO.")).toBeVisible();
    expect(within(spine).getByText("INGENIERÍA.")).toBeVisible();
    expect(within(spine).getByText("PRECISIÓN.")).toBeVisible();
    expect(within(spine).getByTestId("spine-diagram")).toBeInTheDocument();
  });

  it("renders the localized packaging plan as a workspace backdrop", () => {
    render(<MagicCubeExperience />);

    const plan = screen.getByTestId("packaging-plan");
    const stage = screen.getByRole("region", {
      name: "Cubo Mágico 3D interactivo",
    });

    expect(plan.tagName).toBe("svg");
    expect(plan).toHaveAttribute("aria-hidden", "true");
    expect(plan).toHaveTextContent("CUBO 3D");
    expect(
      within(plan).getByTestId("plan-copy-clear-upper-curve"),
    ).toHaveAttribute("d", expect.stringMatching(/^M550\b/));
    expect(
      within(plan).getByTestId("plan-copy-clear-registration"),
    ).toHaveAttribute("transform", "translate(321 0)");
    expect(
      within(plan).getByTestId("plan-registration-motion"),
    ).toContainElement(
      within(plan).getByTestId("plan-copy-clear-registration"),
    );
    expect(stage).not.toContainElement(plan);
    expect(plan.parentElement).toHaveAttribute("data-testid", "workspace");
  });

  it("renders one decorative fixed ground shadow beside the cube frame", () => {
    render(<MagicCubeExperience />);

    const shadow = screen.getByTestId("cube-ground-shadow");
    const stage = screen.getByRole("region", {
      name: "Cubo Mágico 3D interactivo",
    });

    expect(shadow).toHaveAttribute("aria-hidden", "true");
    expect(stage).toContainElement(shadow);
    expect(shadow.parentElement).toBe(stage);
    expect(stage.querySelectorAll('[data-testid="cube-ground-shadow"]')).toHaveLength(1);
    expect(shadow.compareDocumentPosition(stage.querySelector("[class*='cubeFrame']")!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("keeps three primary dock actions visible and relegates undo and layers to an accessible overlay", async () => {
    const user = userEvent.setup();
    render(<MagicCubeExperience />);

    const primaryActions = screen.getByTestId("primary-dock-actions");
    expect(within(primaryActions).getAllByRole("button")).toHaveLength(3);
    expect(within(primaryActions).getByRole("button", { name: "Desordenar" })).toBeVisible();
    expect(within(primaryActions).getByRole("button", { name: "Reiniciar" })).toBeVisible();
    expect(within(primaryActions).getByRole("button", { name: "Ayuda" })).toBeVisible();

    const utilities = screen.getByRole("button", {
      name: "Más controles",
    });
    expect(utilities).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Deshacer" })).not.toBeInTheDocument();

    await user.click(utilities);

    expect(utilities).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Deshacer" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Mostrar controles por capa" }),
    ).toBeVisible();
  });

  it("places the localized drag hint directly below the hero challenge", () => {
    render(<MagicCubeExperience />);

    const challenge = screen.getByRole("button", {
      name: "Desordenar cubo",
    });
    const hint = screen
      .getByText("Izquierdo: pieza = capas · fondo = rotar · Derecho: rotar")
      .closest("p");

    expect(hint).toHaveAttribute("id", "cube-drag-hint");
    expect(hint).toHaveTextContent(
      "Con el dedo: pieza = capa · fondo = rotar",
    );
    expect(challenge.nextElementSibling).toBe(hint);
  });

  it("renders the complete semantic shell on the server without browser globals", () => {
    vi.stubGlobal("document", undefined);
    expect(() => renderToString(<MagicCubeExperience />)).not.toThrow();
    vi.unstubAllGlobals();
  });

  it("uses the persisted locale before the browser and renders the exact Spanish copy", async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "es");
    setBrowserLanguages(["pt-BR", "en-US"]);

    render(<MagicCubeExperience />);

    expect(
      await screen.findByText(
        "Un clásico reinventado en 3D. Girá, desafiá tu mente y volvé a ordenar los colores.",
      ),
    ).toBeVisible();
    expect(document.documentElement.lang).toBe("es");
    expect(screen.getAllByRole("link", { name: "Comprar cubo" })[0]).toHaveAttribute(
      "href",
      buildWhatsAppUrl("es"),
    );
  });

  it("uses Portuguese browser preference and the exact Portuguese purchase URL", async () => {
    setBrowserLanguages(["en-US", "pt-BR"]);

    render(<MagicCubeExperience />);

    expect(
      await screen.findByText(
        "Um clássico reinventado em 3D. Gire, desafie sua mente e volte a ordenar as cores.",
      ),
    ).toBeVisible();
    expect(screen.getByTestId("editorial-spine")).toHaveTextContent(
      "A CAIXA ABERTA",
    );
    expect(
      screen.getByText(
        "Esquerdo: peça = camadas · fundo = girar · Direito: girar",
      ),
    ).toBeVisible();
    expect(
      screen.getByText("Com o dedo: peça = camada · fundo = girar"),
    ).toBeVisible();
    expect(document.documentElement.lang).toBe("pt");
    for (const purchase of screen.getAllByRole("link", { name: "Comprar cubo" })) {
      expect(purchase).toHaveAttribute("href", buildWhatsAppUrl("pt"));
    }
  });

  it("persists a manual language choice without remounting the canvas or resetting game state", async () => {
    const user = userEvent.setup();
    renderReadyExperience();
    const canvasBefore = screen.getByTestId("cube-canvas-probe");

    await user.click(screen.getByRole("button", { name: "Simular giro" }));
    await user.click(screen.getByRole("button", { name: "Confirmar giro visual" }));
    expect(screen.getByTestId("telemetry-move-count")).toHaveTextContent("1");

    await user.click(screen.getByRole("button", { name: "PT" }));

    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("pt");
    expect(document.documentElement.lang).toBe("pt");
    expect(screen.getByTestId("cube-canvas-probe")).toBe(canvasBefore);
    expect(screen.getByTestId("cube-canvas-probe")).toHaveAttribute("data-locale", "pt");
    expect(screen.getByTestId("telemetry-move-count")).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: "Embaralhar cubo" })).toBeVisible();
  });

  it("honors the canvas interaction lock while every purchase action stays enabled", async () => {
    const user = userEvent.setup();
    renderReadyExperience();

    await user.click(screen.getByRole("button", { name: "Iniciar gesto" }));
    await openDockUtilities(user);

    expect(screen.getByRole("button", { name: "Desordenar cubo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Deshacer" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reiniciar" })).toBeDisabled();
    for (const purchase of screen.getAllByRole("link", { name: "Comprar cubo" })) {
      expect(purchase).not.toHaveAttribute("aria-disabled", "true");
      expect(purchase).toHaveAttribute("href", buildWhatsAppUrl("es"));
    }

    await user.click(screen.getByRole("button", { name: "Terminar gesto" }));
    expect(screen.getByRole("button", { name: "Desordenar cubo" })).toBeEnabled();
  });

  it("pauses root ambient motion while a queued move owns the real active cues", async () => {
    const user = userEvent.setup();
    const { container } = renderReadyExperience();
    const telemetry = screen.getByTestId("live-telemetry");
    const experience = container.querySelector("main");

    expect(telemetry).toHaveAttribute("data-motion-paused", "false");
    expect(experience).toHaveAttribute("data-motion-paused", "false");
    await user.click(screen.getByRole("button", { name: "Simular giro" }));

    expect(telemetry).toHaveAttribute("data-motion-paused", "true");
    expect(experience).toHaveAttribute("data-motion-paused", "true");
    expect(container.querySelectorAll('[data-piece-active="true"]')).toHaveLength(9);
    expect(screen.getByTestId("telemetry-turn-direction")).toHaveAttribute(
      "data-direction",
      "positive",
    );
  });

  it("accepts only one move when two scene requests arrive in the same event", async () => {
    const user = userEvent.setup();
    renderReadyExperience();

    await user.click(screen.getByRole("button", { name: "Simular doble giro" }));

    expect(screen.getByTestId("visual-queue-length")).toHaveTextContent("1");
  });

  it(
    "closes success before undo and does not retrigger when that solved state returns",
    async () => {
      const user = userEvent.setup();
      renderReadyExperience();
      const solutionMoves = await solveChallenge(user);
      const lastSolutionMove = solutionMoves.at(-1);

      expect(lastSolutionMove).toBeDefined();
      expect(
        screen.getByRole("heading", { name: "Lo resolviste." }),
      ).toBeVisible();

      await openDockUtilities(user);
      await user.click(screen.getByRole("button", { name: "Deshacer" }));
      expect(
        screen.queryByRole("heading", { name: "Lo resolviste." }),
      ).not.toBeInTheDocument();
      await user.click(
        screen.getByRole("button", { name: "Confirmar giro visual" }),
      );

      await requestMove(user, lastSolutionMove!);
      await user.click(
        screen.getByRole("button", { name: "Confirmar giro visual" }),
      );
      expect(
        screen.queryByRole("heading", { name: "Lo resolviste." }),
      ).not.toBeInTheDocument();
    },
    10_000,
  );

  it(
    "closes success before an HTML face turn and keeps the celebration guard after undo resolves it",
    async () => {
      const user = userEvent.setup();
      renderReadyExperience();
      await solveChallenge(user);

      expect(
        screen.getByRole("heading", { name: "Lo resolviste." }),
      ).toBeVisible();
      await openDockUtilities(user);
      await user.click(
        screen.getByRole("button", { name: "Mostrar controles por capa" }),
      );
      await user.click(
        screen.getByRole("button", { name: "Derecha horario" }),
      );

      expect(
        screen.queryByRole("heading", { name: "Lo resolviste." }),
      ).not.toBeInTheDocument();
      await user.click(
        screen.getByRole("button", { name: "Confirmar giro visual" }),
      );
      await openDockUtilities(user);
      await user.click(screen.getByRole("button", { name: "Deshacer" }));
      await user.click(
        screen.getByRole("button", { name: "Confirmar giro visual" }),
      );
      expect(
        screen.queryByRole("heading", { name: "Lo resolviste." }),
      ).not.toBeInTheDocument();
    },
    10_000,
  );

  it(
    "unlocks the real canvas contract after the finite celebration and closes success on its accepted gesture",
    async () => {
      const user = userEvent.setup();
      renderReadyExperience();
      await solveChallenge(user);
      const canvasGesture = screen.getByRole("button", {
        name: "Simular gesto canvas real",
      });

      expect(
        screen.getByRole("heading", { name: "Lo resolviste." }),
      ).toBeVisible();
      expect(canvasGesture).toBeDisabled();
      await waitFor(
        () => expect(canvasGesture).toBeEnabled(),
        { timeout: 1_200 },
      );
      const experience = document.querySelector("main");
      expect(experience).toHaveAttribute("data-motion-paused", "true");
      await user.click(
        screen.getByRole("button", { name: "Cerrar felicitación" }),
      );
      expect(experience).toHaveAttribute("data-motion-paused", "false");
      await user.click(canvasGesture);

      expect(
        screen.queryByRole("heading", { name: "Lo resolviste." }),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("visual-queue-length")).toHaveTextContent("1");
      expect(experience).toHaveAttribute("data-motion-paused", "true");
    },
    8_000,
  );

  it(
    "counts celebration duration only while the page is visible and resumes the remaining time",
    async () => {
      let visibilityState: DocumentVisibilityState = "visible";
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => visibilityState,
      });
      const user = userEvent.setup();
      renderReadyExperience();
      await solveChallenge(user);
      const canvasGesture = screen.getByRole("button", {
        name: "Simular gesto canvas real",
      });

      expect(canvasGesture).toBeDisabled();
      visibilityState = "hidden";
      fireEvent(document, new Event("visibilitychange"));
      await new Promise((resolve) => window.setTimeout(resolve, 900));
      expect(canvasGesture).toBeDisabled();

      visibilityState = "visible";
      fireEvent(document, new Event("visibilitychange"));
      await waitFor(() => expect(canvasGesture).toBeEnabled(), {
        timeout: 1_200,
      });
    },
    12_000,
  );

  it("uses one polite announcer for confirmed moves, scramble completion, reset and scene errors", async () => {
    const user = userEvent.setup();
    renderReadyExperience();
    const announcer = screen.getByTestId("experience-announcer");

    expect(announcer).toHaveAttribute("aria-live", "polite");
    expect(document.querySelectorAll('[aria-live="polite"]')).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Simular giro" }));
    await user.click(screen.getByRole("button", { name: "Confirmar giro visual" }));
    expect(announcer).toHaveTextContent("Giro confirmado");

    await user.click(screen.getByRole("button", { name: "Desordenar cubo" }));
    for (let index = 0; index < 20; index += 1) {
      await user.click(screen.getByRole("button", { name: "Confirmar giro visual" }));
    }
    expect(announcer).toHaveTextContent("Mezcla completa.");

    await user.click(screen.getByRole("button", { name: "Reiniciar" }));
    expect(announcer).toHaveTextContent("Cubo reiniciado.");

    await user.click(screen.getByRole("button", { name: "Fallar escena" }));
    expect(announcer).toHaveTextContent("No pudimos cargar el cubo 3D.");
  });
});

describe("commercial CSS contract", () => {
  it("keeps the commercial surface light regardless of system color scheme", () => {
    const globalCss = readFileSync(
      resolve(process.cwd(), "app/globals.css"),
      "utf8",
    );

    expect(globalCss).toContain("color-scheme: light");
    expect(globalCss).not.toContain("prefers-color-scheme: dark");
    expect(globalCss).toMatch(/background:\s*#f[7-9]f[7-9]f[6-9]/i);
  });

  it("contains responsive, safe-area and appearance preference gates without transition all", () => {
    const css = readFileSync(
      resolve(process.cwd(), "components/experience/experience.module.css"),
      "utf8",
    );

    expect(css).toContain("env(safe-area-inset-bottom)");
    expect(css).toContain("@media (max-width: 900px)");
    expect(css).toContain("45dvh");
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("@media (prefers-contrast: more)");
    expect(css).toContain("@media (prefers-reduced-transparency: reduce)");
    expect(css).toContain("touch-action: manipulation");
    expect(css).toContain("touch-action: none");
    expect(css).toContain("overscroll-behavior: contain");
    expect(css).toContain("font-variant-numeric: tabular-nums");
    expect(css).not.toMatch(/transition\s*:\s*all\b/);

    const globalCss = readFileSync(
      resolve(process.cwd(), "app/globals.css"),
      "utf8",
    );
    for (const transition of [
      ...css.matchAll(/transition:\s*([^;]+);/g),
      ...globalCss.matchAll(/transition:\s*([^;]+);/g),
    ]) {
      expect(transition[1]).not.toMatch(
        /\b(?:color|background-color|border-color|box-shadow)\b/,
      );
    }
  });

  it("keeps the wordmark target at least 44px and display tracking within the design floor", () => {
    const css = readFileSync(
      resolve(process.cwd(), "components/experience/experience.module.css"),
      "utf8",
    );
    const wordmark = css.match(/\.wordmark\s*\{([^}]*)\}/)?.[1];
    const heading = css.match(/\.heroCopy h1\s*\{([^}]*)\}/)?.[1];

    expect(wordmark).toMatch(/min-height:\s*2\.75rem;/);
    expect(heading).toMatch(/letter-spacing:\s*-0\.04em;/);
  });

  it("defines the approved motion tokens and restrained ambient limits", () => {
    const globalCss = readFileSync(
      resolve(process.cwd(), "app/globals.css"),
      "utf8",
    );
    const css = readFileSync(
      resolve(process.cwd(), "components/experience/experience.module.css"),
      "utf8",
    );

    for (const token of [
      "--ease-out: cubic-bezier(0.23, 1, 0.32, 1)",
      "--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)",
      "--motion-micro: 160ms",
      "--motion-state: 260ms",
      "--motion-editorial: 420ms",
      "--motion-ambient-short: 4.8s",
      "--motion-ambient-long: 8.4s",
    ]) {
      expect(globalCss).toContain(token);
    }

    expect(css).toMatch(
      /@keyframes spine-technical-breathe[\s\S]*?opacity:\s*0\.48;[\s\S]*?opacity:\s*0\.64;/,
    );
    expect(css).toMatch(
      /\.planDrawing\s*\{[^}]*--plan-opacity-low:\s*0\.48;[^}]*--plan-opacity-high:\s*0\.56;/,
    );
    expect(css).toMatch(
      /@media \(max-width: 900px\)[\s\S]*?\.planDrawing\s*\{[^}]*--plan-opacity-low:\s*0\.16;[^}]*--plan-opacity-high:\s*0\.18;/,
    );
    expect(css).toMatch(
      /@keyframes plan-registration-drift[\s\S]*?translate\(3px, -3px\) rotate\(3deg\)/,
    );
    expect(css).toMatch(
      /\.pieceMatrix::after\s*\{[^}]*animation:\s*telemetry-group-sweep var\(--ambient-matrix\)/,
    );
    expect(css).toMatch(
      /@keyframes status-breathe[\s\S]*?opacity:\s*0\.82;[\s\S]*?opacity:\s*1;[\s\S]*?scale\(1\.16\)/,
    );
    expect(css).toMatch(
      /@keyframes purchase-sheen[\s\S]*?78%[\s\S]*?86\.6%/,
    );
    expect(css).toMatch(
      /\.dockUtilitiesPanel\s*\{[^}]*animation:\s*dock-utilities-enter 220ms var\(--ease-out\) both;/,
    );
  });

  it("coordinates every approved ambient region from one staggered director", () => {
    const css = readFileSync(
      resolve(process.cwd(), "components/experience/experience.module.css"),
      "utf8",
    );
    const heroSource = readFileSync(
      resolve(process.cwd(), "components/experience/HeroCopy.tsx"),
      "utf8",
    );
    const experienceRule = css.match(/\.experience\s*\{([^}]*)\}/)?.[1];

    expect(experienceRule).toBeDefined();
    for (const timing of [
      "--ambient-plotter: 10.8s",
      "--ambient-plan: 8.4s",
      "--ambient-registration: 6.4s",
      "--ambient-spine: 7.2s",
      "--ambient-matrix: 4.8s",
      "--ambient-status: 3.2s",
      "--ambient-dock: 6.4s",
      "--ambient-purchase: 7.2s",
      "--ambient-hero: 5.4s",
      "--ambient-cube: 6.4s",
    ]) {
      expect(experienceRule).toContain(timing);
    }

    expect(heroSource).toContain("styles.heroRule");
    expect(css).toMatch(
      /\.controlDock::before\s*\{[^}]*animation:\s*dock-print-rail var\(--ambient-dock\)/,
    );
    expect(css).toMatch(
      /\.heroRule::after\s*\{[^}]*animation:\s*hero-mark-expansion var\(--ambient-hero\)/,
    );
    expect(css).toMatch(
      /\.experience\[data-intro-phase="ready"\] \.cubeFrame\s*\{[^}]*animation:\s*cube-microfloat var\(--ambient-cube\)/,
    );
    expect(css).toMatch(
      /@keyframes cube-microfloat[\s\S]*?translateY\(-2px\)/,
    );
    expect(css).toMatch(
      /@keyframes cube-microfloat-mobile[\s\S]*?translateY\(-1px\)/,
    );

    const shadowRule = css.match(/\.groundShadow\s*\{([^}]*)\}/)?.[1];
    const shadowKeyframes = css.match(
      /@keyframes cube-shadow-drop\s*\{([\s\S]*?)\n\}/,
    )?.[1];
    expect(shadowRule).toBeDefined();
    expect(shadowRule).not.toContain("cube-microfloat");
    expect(shadowKeyframes).toBeDefined();
    expect(shadowKeyframes).not.toContain("translateY(");
  });

  it("uses the reference column split and collapses the cobalt spine without inherited padding", () => {
    const css = readFileSync(
      resolve(process.cwd(), "components/experience/experience.module.css"),
      "utf8",
    );
    const mobileBreakpoint = css.match(
      /@media \(max-width: 900px\) \{([\s\S]*?)\n\}/,
    )?.[1];

    expect(css).toContain("minmax(21rem, 36%)");
    expect(mobileBreakpoint).toMatch(
      /\.cobaltSpine\s*\{[^}]*height:\s*0\.42rem;[^}]*padding:\s*0;/,
    );
  });

  it("keeps a 45dvh cube and compacts the telemetry gap at the 320px breakpoint", () => {
    const css = readFileSync(
      resolve(process.cwd(), "components/experience/experience.module.css"),
      "utf8",
    );
    const narrowBreakpoint = css.match(
      /@media \(max-width: 340px\) \{([\s\S]*?)\n\}/,
    )?.[1];

    expect(narrowBreakpoint).toMatch(
      /\.stage\s*\{[^}]*height:\s*45dvh;/,
    );
    expect(narrowBreakpoint).toMatch(
      /\.telemetry\s*\{[^}]*margin-top:\s*0\.25rem;/,
    );
  });

  it("keeps the mobile telemetry summary and native expandable instrument accessible", () => {
    render(<MagicCubeExperience />);

    const summary = screen.getByRole("group", { name: "Resumen de telemetría" });
    expect(within(summary).getByText("Movimientos")).toBeVisible();
    expect(within(summary).getByText("Estado")).toBeVisible();
    expect(within(summary).getByText("Mezcla")).toBeVisible();
    expect(screen.getByRole("group", { name: "Telemetría completa" })).toHaveAttribute(
      "data-mobile-expandable",
      "true",
    );
    expect(screen.getByText("Ver telemetría completa").closest("summary")).not.toBeNull();
  });

  it("uses perceptible opacity-only success motion for reduced-motion visitors", () => {
    const css = readFileSync(
      resolve(process.cwd(), "components/experience/experience.module.css"),
      "utf8",
    );
    const reducedMotion = css.match(
      /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/,
    )?.[1];
    const reducedSuccess = css.match(
      /@keyframes reduced-success-enter \{([\s\S]*?)\n\}/,
    )?.[1];
    const reducedLight = css.match(
      /@keyframes reduced-success-light \{([\s\S]*?)\n\}/,
    )?.[1];

    expect(reducedMotion).toMatch(
      /\.successMoment\s*\{[^}]*animation-name:\s*reduced-success-enter;[^}]*animation-duration:\s*180ms\s*!important;/,
    );
    expect(reducedMotion).toMatch(
      /\.stage\[data-celebrating="true"\] \.cubeFrame::after\s*\{[^}]*animation-name:\s*reduced-success-light;[^}]*animation-duration:\s*480ms\s*!important;[^}]*inset:\s*7%;[^}]*transform:\s*none;/,
    );
    expect(reducedSuccess).toContain("opacity:");
    expect(reducedSuccess).not.toContain("transform:");
    expect(reducedLight).toMatch(/0%,\s*100%\s*\{[^}]*opacity:\s*0;/);
    expect(reducedLight).toMatch(/40%\s*\{[^}]*opacity:\s*0\.18;/);
    expect(reducedLight).not.toContain("transform:");
  });

  it("reveals the real interface through a transparent package wrapper", () => {
    const css = readFileSync(
      resolve(process.cwd(), "components/experience/experience.module.css"),
      "utf8",
    );
    const intro = css.match(/\.packageIntro\s*\{([^}]*)\}/)?.[1];
    const paper = css.match(/\.packageIntro::before\s*\{([\s\S]*?)\n\}/)?.[1];
    const reveal = css.match(
      /\.packageIntro\[data-phase="reveal"\]::before,[\s\S]*?\{([^}]*)\}/,
    )?.[1];

    expect(intro).toMatch(/background:\s*transparent;/);
    expect(paper).toMatch(/content:\s*"";/);
    expect(paper).toMatch(/background:\s*var\(--paper\);/);
    expect(reveal).toMatch(/opacity:\s*0;/);
    expect(css).toMatch(
      /\.packageIntro\[data-phase="reveal"\],[\s\S]*?\.packageIntro\[data-phase="drop"\]\s*\{[^}]*pointer-events:\s*none;/,
    );
    expect(css).toMatch(
      /\.packageIntro\[data-phase="opening"\]::before,[\s\S]{0,140}package-intro-reduced\s+180ms/,
    );
    const reducedKeyframes = css.match(
      /@keyframes package-intro-reduced\s*\{([\s\S]*?)\n\}/,
    )?.[1];
    expect(reducedKeyframes).toContain("opacity:");
    expect(reducedKeyframes).not.toContain("transform:");
  });
});

function setBrowserLanguages(languages: readonly string[]) {
  Object.defineProperty(window.navigator, "languages", {
    configurable: true,
    value: languages,
  });
}

async function solveChallenge(
  user: ReturnType<typeof userEvent.setup>,
): Promise<readonly CubeMove[]> {
  await user.click(screen.getByRole("button", { name: "Desordenar cubo" }));
  const queued = JSON.parse(
    screen.getByTestId("visual-queue-json").textContent ?? "[]",
  ) as readonly QueuedMove[];
  const scrambleMoves = queued.map((entry) => entry.move);

  for (let index = 0; index < scrambleMoves.length; index += 1) {
    await user.click(
      screen.getByRole("button", { name: "Confirmar giro visual" }),
    );
  }

  const solutionMoves = [...scrambleMoves].reverse().map(inverseMove);
  for (const move of solutionMoves) {
    await requestMove(user, move);
    await user.click(
      screen.getByRole("button", { name: "Confirmar giro visual" }),
    );
  }

  return solutionMoves;
}

async function requestMove(
  user: ReturnType<typeof userEvent.setup>,
  move: CubeMove,
) {
  await user.click(screen.getByTestId(moveRequestTestId(move)));
}

function renderReadyExperience() {
  const view = render(<MagicCubeExperience />);
  fireEvent.keyDown(window, { key: "Escape" });
  return view;
}

function firePackageAnimationEnd() {
  const event = new Event("animationend", { bubbles: true });
  Object.defineProperty(event, "animationName", {
    value: "intro-package-finish",
  });
  fireEvent(screen.getByTestId("package-intro-timeline"), event);
}

async function openDockUtilities(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  const toggle = screen.getByRole("button", { name: "Más controles" });
  if (toggle.getAttribute("aria-expanded") !== "true") {
    await user.click(toggle);
  }
}

function moveRequestTestId(move: CubeMove): string {
  return `request-${move.axis}-${move.layer}-${move.turns}`;
}
