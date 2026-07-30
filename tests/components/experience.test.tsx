import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MagicCubeExperience } from "@/components/experience/MagicCubeExperience";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

vi.mock("@/components/cube/CubeCanvas", () => ({
  CubeCanvas: ({
    locale,
    onInteractionLockChange,
    onMoveComplete,
    onMoveRequest,
    onSceneError,
    queue,
  }: {
    readonly locale: "es" | "pt";
    readonly onInteractionLockChange?: (locked: boolean) => void;
    readonly onMoveComplete: () => void;
    readonly onMoveRequest: (move: {
      readonly axis: "x";
      readonly layer: 1;
      readonly turns: 1;
    }) => void;
    readonly onSceneError?: (reason: "error" | "webgl") => void;
    readonly queue: readonly unknown[];
  }) => (
    <div data-locale={locale} data-testid="cube-canvas-probe">
      <span data-testid="visual-queue-length">{queue.length}</span>
      <button
        type="button"
        onClick={() => onMoveRequest({ axis: "x", layer: 1, turns: 1 })}
      >
        Simular giro
      </button>
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
});

function setBrowserLanguages(languages: readonly string[]) {
  Object.defineProperty(window.navigator, "languages", {
    configurable: true,
    value: languages,
  });
}
