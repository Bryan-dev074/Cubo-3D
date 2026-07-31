import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { HelpDialog } from "@/components/experience/HelpDialog";
import { dictionaries } from "@/lib/i18n/dictionaries";

afterEach(cleanup);

describe("HelpDialog", () => {
  it("focuses the close control, makes the background inert, closes with Escape and restores focus", async () => {
    const user = userEvent.setup();
    render(<HelpHarness />);
    const trigger = screen.getByRole("button", { name: "Ayuda" });

    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Cómo jugar" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByTestId("dialog-background")).toHaveAttribute("inert");
    expect(screen.getByTestId("dialog-background")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("button", { name: "Cerrar ayuda" })).toHaveFocus();
    expect(
      screen.getByText(
        "Arrastrá una pieza con el botón izquierdo para girar su capa. Arrastrá el fondo con el botón izquierdo o mantené el botón derecho y arrastrá en cualquier punto del escenario para rotar la vista. En móvil, arrastrá una pieza para girar su capa o el fondo para rotar la vista.",
      ),
    ).toBeVisible();

    await user.tab();
    expect(screen.getByRole("button", { name: "Cerrar ayuda" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Cerrar ayuda" })).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("dialog-background")).not.toHaveAttribute("inert");
    expect(trigger).toHaveFocus();
  });

  it("closes from its visible control and restores focus to the Portuguese trigger", async () => {
    const user = userEvent.setup();
    render(<HelpHarness locale="pt" />);
    const trigger = screen.getByRole("button", { name: "Ajuda" });

    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Como jogar" })).toBeVisible();
    expect(
      screen.getByText(
        "Arraste uma peça com o botão esquerdo para girar a camada. Arraste o fundo com o botão esquerdo ou segure o botão direito e arraste em qualquer ponto da cena para girar a vista. No celular, arraste uma peça para girar a camada ou o fundo para girar a vista.",
      ),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Fechar ajuda" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

function HelpHarness({ locale = "es" }: { readonly locale?: "es" | "pt" }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const dictionary = dictionaries[locale];

  return (
    <>
      <div ref={backgroundRef} data-testid="dialog-background">
        <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
          {dictionary.helpButton}
        </button>
      </div>
      <HelpDialog
        backgroundRef={backgroundRef}
        dictionary={dictionary}
        isOpen={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
      />
    </>
  );
}
