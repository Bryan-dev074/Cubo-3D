import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FaceControls } from "@/components/experience/FaceControls";
import { dictionaries } from "@/lib/i18n/dictionaries";

const SPANISH_LAYERS = [
  "Derecha",
  "Izquierda",
  "Superior",
  "Inferior",
  "Frontal",
  "Trasera",
  "Centro vertical",
  "Centro horizontal",
  "Centro frontal",
] as const;

afterEach(cleanup);

describe("FaceControls", () => {
  it("expands nine Spanish layers with visible natural-language controls in both directions", async () => {
    const user = userEvent.setup();
    render(<FaceControls dictionary={dictionaries.es} onMove={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Mostrar controles por capa" }));
    const group = screen.getByRole("group", { name: "Giros por capa" });

    for (const layer of SPANISH_LAYERS) {
      expect(within(group).getByRole("button", { name: `${layer} horario` })).toBeVisible();
      expect(within(group).getByRole("button", { name: `${layer} antihorario` })).toBeVisible();
    }

    expect(within(group).getAllByRole("button")).toHaveLength(18);
  });

  it("renders localized Portuguese names rather than notation-only controls", async () => {
    const user = userEvent.setup();
    render(<FaceControls dictionary={dictionaries.pt} onMove={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Mostrar controles por camada" }));
    const group = screen.getByRole("group", { name: "Giros por camada" });

    expect(within(group).getByRole("button", { name: "Direita horário" })).toBeVisible();
    expect(
      within(group).getByRole("button", { name: "Direita anti-horário" }),
    ).toBeVisible();
    expect(within(group).queryByRole("button", { name: "R" })).not.toBeInTheDocument();
  });

  it("emits the exact layer move selected through a natural-language control", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(<FaceControls dictionary={dictionaries.es} onMove={onMove} />);

    await user.click(screen.getByRole("button", { name: "Mostrar controles por capa" }));
    await user.click(screen.getByRole("button", { name: "Derecha horario" }));

    expect(onMove).toHaveBeenCalledOnce();
    expect(onMove).toHaveBeenCalledWith({ axis: "x", layer: 1, turns: -1 });
  });

  it("disables only move controls during animation and leaves purchase unaffected", async () => {
    const user = userEvent.setup();
    render(
      <>
        <FaceControls dictionary={dictionaries.es} isAnimating onMove={vi.fn()} />
        <a href="https://wa.me/595982064334">Comprar cubo</a>
      </>,
    );

    const toggle = screen.getByRole("button", { name: "Mostrar controles por capa" });
    expect(toggle).toBeEnabled();
    await user.click(toggle);

    const moveButtons = within(
      screen.getByRole("group", { name: "Giros por capa" }),
    ).getAllByRole("button");
    expect(moveButtons).toHaveLength(18);
    expect(moveButtons.every((button) => button.hasAttribute("disabled"))).toBe(true);

    const purchase = screen.getByRole("link", { name: "Comprar cubo" });
    expect(purchase).toHaveAttribute("href", "https://wa.me/595982064334");
    expect(purchase).not.toHaveAttribute("aria-disabled", "true");
  });
});
