import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CubeLab } from "@/components/cube/CubeLab";

vi.mock("@/components/cube/CubeCanvas", () => ({
  CubeCanvas: ({
    onInteractionLockChange,
    onMoveRequest,
  }: {
    readonly onInteractionLockChange?: (locked: boolean) => void;
    readonly onMoveRequest: (move: {
      readonly axis: "x";
      readonly layer: 1;
      readonly turns: 1;
    }) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onInteractionLockChange?.(true)}>
        Simular inicio de gesto
      </button>
      <button type="button" onClick={() => onInteractionLockChange?.(false)}>
        Simular fin de gesto
      </button>
      <button
        type="button"
        onClick={() => onMoveRequest({ axis: "x", layer: 1, turns: 1 })}
      >
        Simular giro aceptado
      </button>
    </div>
  ),
}));

afterEach(cleanup);

describe("CubeLab interaction lock", () => {
  it("disables incompatible DOM controls during a layer gesture but preserves purchase", async () => {
    const user = userEvent.setup();
    render(<CubeLab />);

    await user.click(screen.getByRole("button", { name: "Mostrar controles por capa" }));
    await user.click(screen.getByRole("button", { name: "Simular inicio de gesto" }));

    expect(screen.getByRole("button", { name: "Mezclar 20 movimientos" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reiniciar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Luz neutral" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Luz rasante" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Órbita opuesta" })).toBeDisabled();

    const faceMoves = within(
      screen.getByRole("group", { name: "Giros por capa" }),
    ).getAllByRole("button");
    expect(faceMoves).toHaveLength(18);
    expect(faceMoves.every((button) => button.hasAttribute("disabled"))).toBe(true);

    const purchase = screen.getByRole("link", { name: "Comprar por WhatsApp" });
    expect(purchase).toHaveAttribute("href", expect.stringContaining("https://wa.me/"));
    expect(purchase).not.toHaveAttribute("aria-disabled", "true");

    await user.click(screen.getByRole("button", { name: "Simular fin de gesto" }));
    expect(screen.getByRole("button", { name: "Mezclar 20 movimientos" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Luz rasante" })).toBeEnabled();
    expect(faceMoves.every((button) => !button.hasAttribute("disabled"))).toBe(true);
  });

  it("lets the scene enqueue the gesture it owns while external controls are locked", async () => {
    const user = userEvent.setup();
    render(<CubeLab />);

    await user.click(screen.getByRole("button", { name: "Simular inicio de gesto" }));
    await user.click(screen.getByRole("button", { name: "Simular giro aceptado" }));

    expect(screen.getByText("1 movimientos en cola")).toBeVisible();
  });
});
