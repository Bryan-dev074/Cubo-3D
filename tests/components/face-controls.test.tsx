import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FaceControls } from "@/components/experience/FaceControls";
import { dictionaries } from "@/lib/i18n/dictionaries";
import type { Axis, AxisValue } from "@/lib/cube/types";

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

const MOVE_CASES = [
  { label: "Derecha horario", axis: "x", layer: 1, turns: -1 },
  { label: "Derecha antihorario", axis: "x", layer: 1, turns: 1 },
  { label: "Izquierda horario", axis: "x", layer: -1, turns: 1 },
  { label: "Izquierda antihorario", axis: "x", layer: -1, turns: -1 },
  { label: "Superior horario", axis: "y", layer: 1, turns: -1 },
  { label: "Superior antihorario", axis: "y", layer: 1, turns: 1 },
  { label: "Inferior horario", axis: "y", layer: -1, turns: 1 },
  { label: "Inferior antihorario", axis: "y", layer: -1, turns: -1 },
  { label: "Frontal horario", axis: "z", layer: 1, turns: -1 },
  { label: "Frontal antihorario", axis: "z", layer: 1, turns: 1 },
  { label: "Trasera horario", axis: "z", layer: -1, turns: 1 },
  { label: "Trasera antihorario", axis: "z", layer: -1, turns: -1 },
  { label: "Centro vertical horario", axis: "x", layer: 0, turns: 1 },
  { label: "Centro vertical antihorario", axis: "x", layer: 0, turns: -1 },
  { label: "Centro horizontal horario", axis: "y", layer: 0, turns: 1 },
  { label: "Centro horizontal antihorario", axis: "y", layer: 0, turns: -1 },
  { label: "Centro frontal horario", axis: "z", layer: 0, turns: -1 },
  { label: "Centro frontal antihorario", axis: "z", layer: 0, turns: 1 },
] as const satisfies readonly {
  readonly label: string;
  readonly axis: Axis;
  readonly layer: AxisValue;
  readonly turns: -1 | 1;
}[];

afterEach(cleanup);

describe("FaceControls", () => {
  it("keeps the localized toggle name explicit in collapsed and expanded states", async () => {
    const user = userEvent.setup();
    render(<FaceControls dictionary={dictionaries.es} onMove={vi.fn()} />);

    const toggle = screen.getByRole("button", {
      name: "Mostrar controles por capa",
    });
    expect(toggle).toHaveAttribute("aria-label", "Mostrar controles por capa");

    await user.click(toggle);

    expect(
      screen.getByRole("button", { name: "Ocultar controles por capa" }),
    ).toHaveAttribute("aria-label", "Ocultar controles por capa");
  });

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

  it.each(MOVE_CASES)("emits the exact $label move", async ({ label, axis, layer, turns }) => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(<FaceControls dictionary={dictionaries.es} onMove={onMove} />);

    await user.click(screen.getByRole("button", { name: "Mostrar controles por capa" }));
    await user.click(screen.getByRole("button", { name: label }));

    expect(onMove).toHaveBeenCalledOnce();
    expect(onMove).toHaveBeenCalledWith({ axis, layer, turns });
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
