import {
  cleanup,
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

import { MagicCubeExperience } from "@/components/experience/MagicCubeExperience";
import { inverseMove } from "@/lib/cube/moves";
import type { CubeMove } from "@/lib/cube/types";
import type { QueuedMove } from "@/lib/game/reducer";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

vi.mock("@/components/cube/CubeCanvas", () => ({
  CubeCanvas: ({
    isCelebrating = false,
    locale,
    onInteractionLockChange,
    onMoveComplete,
    onMoveRequest,
    onSceneError,
    queue,
  }: {
    readonly isCelebrating?: boolean;
    readonly locale: "es" | "pt";
    readonly onInteractionLockChange?: (locked: boolean) => void;
    readonly onMoveComplete: () => void;
    readonly onMoveRequest: (move: CubeMove) => void;
    readonly onSceneError?: (reason: "error" | "webgl") => void;
    readonly queue: readonly QueuedMove[];
  }) => (
    <div data-locale={locale} data-testid="cube-canvas-probe">
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
    </div>
  ),
}));

const LOCALE_STORAGE_KEY = "cubo3d-locale";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  window.localStorage.clear();
  setBrowserLanguages(["es-PY"]);
  document.documentElement.lang = "es";
});

describe("MagicCubeExperience locale and commerce", () => {
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
    const lines = within(heading).getAllByTestId("title-line");

    expect(lines).toHaveLength(2);
    expect(lines[0]).toHaveTextContent(/^Cubo$/);
    expect(lines[1]).toHaveTextContent(/^Mágico 3D$/);
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
    expect(stage).not.toContainElement(plan);
    expect(plan.parentElement).toHaveAttribute("data-testid", "workspace");
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
    const hint = screen.getByText("Arrastrá para rotar el cubo");

    expect(hint).toHaveAttribute("id", "cube-drag-hint");
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
    expect(screen.getByText("Arraste para girar o cubo")).toBeVisible();
    expect(document.documentElement.lang).toBe("pt");
    for (const purchase of screen.getAllByRole("link", { name: "Comprar cubo" })) {
      expect(purchase).toHaveAttribute("href", buildWhatsAppUrl("pt"));
    }
  });

  it("persists a manual language choice without remounting the canvas or resetting game state", async () => {
    const user = userEvent.setup();
    render(<MagicCubeExperience />);
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
    render(<MagicCubeExperience />);

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

  it("pauses idle telemetry motion while a queued move owns the real active cues", async () => {
    const user = userEvent.setup();
    const { container } = render(<MagicCubeExperience />);
    const telemetry = screen.getByTestId("live-telemetry");

    expect(telemetry).toHaveAttribute("data-motion-paused", "false");
    await user.click(screen.getByRole("button", { name: "Simular giro" }));

    expect(telemetry).toHaveAttribute("data-motion-paused", "true");
    expect(container.querySelectorAll('[data-piece-active="true"]')).toHaveLength(9);
    expect(screen.getByTestId("telemetry-turn-direction")).toHaveAttribute(
      "data-direction",
      "positive",
    );
  });

  it("accepts only one move when two scene requests arrive in the same event", async () => {
    const user = userEvent.setup();
    render(<MagicCubeExperience />);

    await user.click(screen.getByRole("button", { name: "Simular doble giro" }));

    expect(screen.getByTestId("visual-queue-length")).toHaveTextContent("1");
  });

  it(
    "closes success before undo and does not retrigger when that solved state returns",
    async () => {
      const user = userEvent.setup();
      render(<MagicCubeExperience />);
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
      render(<MagicCubeExperience />);
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
      render(<MagicCubeExperience />);
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
      await user.click(canvasGesture);

      expect(
        screen.queryByRole("heading", { name: "Lo resolviste." }),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("visual-queue-length")).toHaveTextContent("1");
    },
    8_000,
  );

  it("uses one polite announcer for confirmed moves, scramble completion, reset and scene errors", async () => {
    const user = userEvent.setup();
    render(<MagicCubeExperience />);
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
