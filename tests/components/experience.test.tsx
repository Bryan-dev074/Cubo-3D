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
        "Desordenalo, resolvelo y descubrí por qué este clásico se siente mejor en tus manos.",
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
        "Embaralhe, resolva e descubra por que este clássico fica ainda melhor nas suas mãos.",
      ),
    ).toBeVisible();
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

  it("closes success before undo and does not retrigger when that solved state returns", async () => {
    const user = userEvent.setup();
    render(<MagicCubeExperience />);
    const solutionMoves = await solveChallenge(user);
    const lastSolutionMove = solutionMoves.at(-1);

    expect(lastSolutionMove).toBeDefined();
    expect(screen.getByRole("heading", { name: "Lo resolviste." })).toBeVisible();

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
  });

  it("closes success before an HTML face turn and keeps the celebration guard after undo resolves it", async () => {
    const user = userEvent.setup();
    render(<MagicCubeExperience />);
    await solveChallenge(user);

    expect(screen.getByRole("heading", { name: "Lo resolviste." })).toBeVisible();
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
    await user.click(screen.getByRole("button", { name: "Deshacer" }));
    await user.click(
      screen.getByRole("button", { name: "Confirmar giro visual" }),
    );
    expect(
      screen.queryByRole("heading", { name: "Lo resolviste." }),
    ).not.toBeInTheDocument();
  });

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
  it("contains responsive, safe-area and appearance preference gates without transition all", () => {
    const css = readFileSync(
      resolve(process.cwd(), "components/experience/experience.module.css"),
      "utf8",
    );

    expect(css).toContain("env(safe-area-inset-bottom)");
    expect(css).toContain("@media (max-width: 700px)");
    expect(css).toContain("45dvh");
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("@media (prefers-contrast: more)");
    expect(css).toContain("@media (prefers-reduced-transparency: reduce)");
    expect(css).not.toMatch(/transition\s*:\s*all\b/);
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

  it("keeps dark accent, CTA, hover and spine text at normal-text contrast", () => {
    const css = readFileSync(
      resolve(process.cwd(), "components/experience/experience.module.css"),
      "utf8",
    );
    const darkTheme = css.match(
      /@media \(prefers-color-scheme: dark\) \{([\s\S]*?)\n\}/,
    )?.[1];
    const darkHighContrast = css.match(
      /@media \(prefers-color-scheme: dark\) and \(prefers-contrast: more\) \{([\s\S]*?)\n\}/,
    )?.[1];

    const paper = readCssColor(darkTheme, "--paper");
    const paperRaised = readCssColor(darkTheme, "--paper-raised");
    const accent = readCssColor(darkTheme, "--cobalt");
    const surface = readCssColor(darkTheme, "--cobalt-surface");
    const surfaceHover = readCssColor(
      darkTheme,
      "--cobalt-surface-hover",
    );

    expect(contrastRatio(accent, paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(accent, paperRaised)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#ffffff", surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#ffffff", surfaceHover)).toBeGreaterThanOrEqual(4.5);

    const contrastPaper = readCssColor(darkHighContrast, "--paper");
    const contrastAccent = readCssColor(darkHighContrast, "--cobalt");
    const contrastSurface = readCssColor(
      darkHighContrast,
      "--cobalt-surface",
    );
    expect(contrastPaper).not.toBe("#ffffff");
    expect(contrastRatio(contrastAccent, contrastPaper)).toBeGreaterThanOrEqual(
      7,
    );
    expect(contrastRatio("#ffffff", contrastSurface)).toBeGreaterThanOrEqual(7);
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

function moveRequestTestId(move: CubeMove): string {
  return `request-${move.axis}-${move.layer}-${move.turns}`;
}

function readCssColor(
  cssBlock: string | undefined,
  variable: string,
): string {
  const value = cssBlock?.match(
    new RegExp(`${variable}:\\s*(#[0-9a-fA-F]{6})`),
  )?.[1];
  expect(value, `${variable} must be a six-digit hex color`).toBeDefined();
  return value!;
}

function contrastRatio(foreground: string, background: string): number {
  const light = relativeLuminance(foreground);
  const dark = relativeLuminance(background);
  return (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
}

function relativeLuminance(color: string): number {
  const channels = color
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return (
    channels[0] * 0.2126 +
    channels[1] * 0.7152 +
    channels[2] * 0.0722
  );
}
