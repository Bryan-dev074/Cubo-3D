import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { celebrationSeparationScale } from "@/components/cube/MagicCube";
import { SuccessMoment } from "@/components/experience/SuccessMoment";
import { inverseMove } from "@/lib/cube/moves";
import { generateScramble } from "@/lib/cube/scramble";
import {
  createInitialGameState,
  gameReducer,
  type GameState,
} from "@/lib/game/reducer";
import { shouldCelebrate } from "@/lib/game/selectors";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

afterEach(cleanup);

describe("SuccessMoment", () => {
  it("stays absent for every non-eligible challenge state", () => {
    const scramble = generateScramble({ length: 18, seed: 5101 });
    const initial = createInitialGameState();
    const queued = gameReducer(initial, { type: "start-scramble", moves: scramble });
    const scrambled = confirmAll(queued, scramble.length);

    for (const state of [initial, queued, scrambled]) {
      const { unmount } = render(
        <SuccessMoment
          dictionary={dictionaries.es}
          isOpen={shouldCelebrate(state)}
          onDismiss={vi.fn()}
          onReset={vi.fn()}
          purchaseHref={buildWhatsAppUrl("es")}
        />,
      );
      expect(screen.queryByText("Lo resolviste.")).not.toBeInTheDocument();
      unmount();
    }
  });

  it("shows the exact Spanish copy and enabled WhatsApp CTA only for an eligible solution", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    const onReset = vi.fn();
    const eligible = completeChallenge(5102);

    expect(shouldCelebrate(eligible)).toBe(true);
    render(
      <SuccessMoment
        dictionary={dictionaries.es}
        isOpen={shouldCelebrate(eligible)}
        onDismiss={onDismiss}
        onReset={onReset}
        purchaseHref={buildWhatsAppUrl("es")}
      />,
    );

    expect(screen.getByRole("heading", { name: "Lo resolviste." })).toBeVisible();
    expect(screen.getByText("Ahora llevá el desafío a tus manos.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Comprar ahora" })).toHaveAttribute(
      "href",
      buildWhatsAppUrl("es"),
    );
    expect(screen.getByRole("link", { name: "Comprar ahora" })).not.toHaveAttribute(
      "aria-disabled",
    );

    await user.click(screen.getByRole("button", { name: "Cerrar felicitación" }));
    expect(onDismiss).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Reiniciar" }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("renders the exact Portuguese resolution copy and purchase action", () => {
    render(
      <SuccessMoment
        dictionary={dictionaries.pt}
        isOpen
        onDismiss={vi.fn()}
        onReset={vi.fn()}
        purchaseHref={buildWhatsAppUrl("pt")}
      />,
    );

    expect(screen.getByRole("heading", { name: "Você conseguiu." })).toBeVisible();
    expect(screen.getByText("Agora leve o desafio para as suas mãos.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Comprar agora" })).toHaveAttribute(
      "href",
      buildWhatsAppUrl("pt"),
    );
  });

  it("separates cubies by at most six percent and removes displacement for reduced motion", () => {
    expect(celebrationSeparationScale(0, false)).toBe(1);
    expect(celebrationSeparationScale(0.5, false)).toBeCloseTo(1.06);
    expect(celebrationSeparationScale(1, false)).toBeCloseTo(1);
    expect(celebrationSeparationScale(0.5, true)).toBe(1);
  });
});

function confirmAll(state: GameState, count: number): GameState {
  return Array.from({ length: count }).reduce<GameState>(
    (current) => gameReducer(current, { type: "confirm-move" }),
    state,
  );
}

function completeChallenge(seed: number): GameState {
  const scramble = generateScramble({ length: 18, seed });
  let state = gameReducer(createInitialGameState(), {
    type: "start-scramble",
    moves: scramble,
  });
  state = confirmAll(state, scramble.length);

  for (const move of [...scramble].reverse().map(inverseMove)) {
    state = gameReducer(state, { type: "queue-move", move });
    state = gameReducer(state, { type: "confirm-move" });
  }

  return state;
}
