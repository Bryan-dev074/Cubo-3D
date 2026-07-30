import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LiveTelemetry } from "@/components/experience/LiveTelemetry";
import { generateScramble } from "@/lib/cube/scramble";
import type { CubeMove } from "@/lib/cube/types";
import {
  createInitialGameState,
  gameReducer,
  type GameState,
} from "@/lib/game/reducer";
import { createTelemetrySnapshot } from "@/lib/game/telemetry";
import { dictionaries } from "@/lib/i18n/dictionaries";

const RIGHT: CubeMove = { axis: "x", layer: 1, turns: 1 };
const MIDDLE: CubeMove = { axis: "x", layer: 0, turns: -1 };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible",
  });
});

describe("LiveTelemetry localization and truthfulness", () => {
  it("exposes the layer diagram, turn dial and truthful mix meter", () => {
    const state = confirmAll(
      gameReducer(createInitialGameState(), {
        type: "start-scramble",
        moves: generateScramble({ length: 18, seed: 5201 }),
      }),
      3,
    );
    const telemetry = createTelemetrySnapshot(state, state.queue[0]?.move);

    render(
      <LiveTelemetry
        dictionary={dictionaries.es}
        snapshot={telemetry}
      />,
    );

    expect(screen.getByTestId("layer-diagram")).toBeInTheDocument();
    expect(screen.getByTestId("turn-dial")).toBeInTheDocument();
    expect(screen.getByTestId("mix-meter")).toHaveAttribute(
      "aria-valuenow",
      String(telemetry.scrambleProgress.confirmed),
    );
  });

  it("shows every reviewed Spanish label and the ready state from the real snapshot", () => {
    renderTelemetry(createInitialGameState(), "es");

    for (const label of [
      "26 piezas",
      "9 capas",
      "Giros de 90°",
      "Movimientos",
      "Último giro",
      "Estado",
      "Mezcla",
    ]) {
      expect(screen.getAllByText(label)[0]).toBeVisible();
    }
    expect(screen.getAllByText("Listo")[0]).toBeVisible();
    expect(screen.getByTestId("telemetry-move-count")).toHaveTextContent("0");
    expect(screen.getByTestId("telemetry-scramble-progress")).toHaveTextContent("0 / 20");
  });

  it("shows every reviewed Portuguese label and state", () => {
    renderTelemetry(createInitialGameState(), "pt");

    for (const label of [
      "26 peças",
      "9 camadas",
      "Giros de 90°",
      "Movimentos",
      "Último giro",
      "Estado",
      "Mistura",
    ]) {
      expect(screen.getAllByText(label)[0]).toBeVisible();
    }
    expect(screen.getAllByText("Pronto")[0]).toBeVisible();
  });

  it("identifies nine outer pieces and the exact active layer with color and non-color cues", () => {
    const { container } = renderTelemetry(createInitialGameState(), "es", RIGHT);

    expect(container.querySelectorAll('[data-piece-active="true"]')).toHaveLength(9);
    expect(container.querySelectorAll('[data-piece-cue="ring"]')).toHaveLength(9);
    expect(container.querySelectorAll("[data-layer-axis]")).toHaveLength(9);
    const activeLayer = container.querySelector('[data-layer-active="true"]');
    expect(activeLayer).toHaveAttribute("data-layer-axis", "x");
    expect(activeLayer).toHaveAttribute("data-layer-value", "1");
    expect(screen.getByTestId("telemetry-turn-direction")).toHaveAttribute(
      "data-direction",
      "positive",
    );
    expect(screen.getByTestId("telemetry-turn-value")).toHaveTextContent("+90°");
  });

  it("identifies eight middle pieces and follows the real negative turn sign", () => {
    const { container } = renderTelemetry(createInitialGameState(), "es", MIDDLE);

    expect(container.querySelectorAll('[data-piece-active="true"]')).toHaveLength(8);
    expect(container.querySelector('[data-layer-active="true"]')).toHaveAttribute(
      "data-layer-value",
      "0",
    );
    expect(screen.getByTestId("telemetry-turn-direction")).toHaveAttribute(
      "data-direction",
      "negative",
    );
    expect(screen.getByTestId("telemetry-turn-value")).toHaveTextContent("-90°");
  });

  it("uses confirmed user moves, the truthful last confirmed move and actual scramble total", () => {
    const scramble = generateScramble({ length: 18, seed: 5201 });
    let state = gameReducer(createInitialGameState(), {
      type: "start-scramble",
      moves: scramble,
    });
    state = confirmAll(state, 3);
    const { rerender } = render(
      <LiveTelemetry
        dictionary={dictionaries.es}
        snapshot={createTelemetrySnapshot(state, state.queue[0]?.move)}
      />,
    );

    expect(screen.getByTestId("telemetry-move-count")).toHaveTextContent("0");
    expect(screen.getByTestId("telemetry-scramble-progress")).toHaveTextContent("3 / 18");
    expect(screen.getByTestId("telemetry-last-move")).not.toHaveTextContent("Sin giros");
    expect(screen.getAllByText("Desordenando")[0]).toBeVisible();

    state = confirmAll(state, state.queue.length);
    state = gameReducer(state, { type: "queue-move", move: RIGHT });
    state = gameReducer(state, { type: "confirm-move" });
    rerender(
      <LiveTelemetry
        dictionary={dictionaries.es}
        snapshot={createTelemetrySnapshot(state)}
      />,
    );

    expect(screen.getByTestId("telemetry-move-count")).toHaveTextContent("1");
    expect(screen.getByTestId("telemetry-last-move")).toHaveTextContent(
      "Derecha antihorario",
    );
    expect(screen.getAllByText("En juego")[0]).toBeVisible();
  });
});

describe("LiveTelemetry motion and mobile disclosure", () => {
  it("opens the full instrument after hydration on desktop", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(
        (query) =>
          ({
            matches: query === "(prefers-reduced-motion: reduce)",
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          }) as unknown as MediaQueryList,
      ),
    );

    renderTelemetry(createInitialGameState(), "es");
    const disclosure = screen.getByRole("group", {
      name: "Telemetría completa",
    }) as HTMLDetailsElement;

    await waitFor(() => expect(disclosure.open).toBe(true));
  });

  it("keeps a user-opened mobile instrument open across telemetry updates", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "matchMedia",
      vi.fn(
        (query) =>
          ({
            matches: query === "(max-width: 900px)",
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          }) as unknown as MediaQueryList,
      ),
    );
    const initial = createInitialGameState();
    const { rerender } = render(
      <LiveTelemetry
        dictionary={dictionaries.es}
        snapshot={createTelemetrySnapshot(initial)}
      />,
    );
    const disclosure = screen.getByRole("group", {
      name: "Telemetría completa",
    }) as HTMLDetailsElement;

    expect(disclosure.open).toBe(false);
    await user.click(screen.getByText("Ver telemetría completa"));
    expect(disclosure.open).toBe(true);

    const queued = gameReducer(initial, { type: "queue-move", move: RIGHT });
    rerender(
      <LiveTelemetry
        dictionary={dictionaries.es}
        snapshot={createTelemetrySnapshot(queued, RIGHT)}
      />,
    );
    expect(disclosure.open).toBe(true);
  });

  it("renders a closed viewport-independent disclosure and hydrates at 320px without a layout-state mismatch", async () => {
    const snapshot = createTelemetrySnapshot(createInitialGameState());
    vi.stubGlobal("document", undefined);
    const html = renderToString(
      <LiveTelemetry dictionary={dictionaries.es} snapshot={snapshot} />,
    );
    expect(html).not.toMatch(/<details[^>]*\sopen(?:=|>)/);
    vi.unstubAllGlobals();
    vi.stubGlobal(
      "matchMedia",
      vi.fn(
        (query) =>
          ({
            matches:
              query === "(prefers-reduced-motion: reduce)" ||
              query === "(max-width: 900px)",
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          }) as unknown as MediaQueryList,
      ),
    );
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);
    let root: Root | undefined;

    await act(async () => {
      root = hydrateRoot(
        container,
        <LiveTelemetry dictionary={dictionaries.es} snapshot={snapshot} />,
      );
    });

    expect(
      consoleError.mock.calls.some(([message]) =>
        String(message).includes("hydrated"),
      ),
    ).toBe(false);
    expect(container.querySelector("details")).not.toHaveAttribute("open");
    await act(async () => root?.unmount());
    container.remove();
  });

  it("pauses decorative motion when the page becomes hidden", async () => {
    renderTelemetry(createInitialGameState(), "es");
    const instrument = screen.getByTestId("live-telemetry");
    expect(instrument).toHaveAttribute("data-motion-paused", "false");

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));

    await waitFor(() =>
      expect(instrument).toHaveAttribute("data-motion-paused", "true"),
    );
  });

  it("pauses decorative motion for reduced-motion preference or an active layer gesture", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(
      (query) =>
        ({
          matches: query === "(prefers-reduced-motion: reduce)",
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList,
      ),
    );

    const { rerender } = render(
      <LiveTelemetry
        dictionary={dictionaries.es}
        snapshot={createTelemetrySnapshot(createInitialGameState())}
      />,
    );
    expect(screen.getByTestId("live-telemetry")).toHaveAttribute(
      "data-motion-paused",
      "true",
    );

    vi.unstubAllGlobals();
    rerender(
      <LiveTelemetry
        dictionary={dictionaries.es}
        pauseMotion
        snapshot={createTelemetrySnapshot(createInitialGameState())}
      />,
    );
    expect(screen.getByTestId("live-telemetry")).toHaveAttribute(
      "data-motion-paused",
      "true",
    );
  });
});

function renderTelemetry(
  state: GameState,
  locale: "es" | "pt",
  activeMove?: CubeMove,
) {
  return render(
    <LiveTelemetry
      dictionary={dictionaries[locale]}
      snapshot={createTelemetrySnapshot(state, activeMove)}
    />,
  );
}

function confirmAll(state: GameState, count: number): GameState {
  return Array.from({ length: count }).reduce<GameState>(
    (current) => gameReducer(current, { type: "confirm-move" }),
    state,
  );
}
