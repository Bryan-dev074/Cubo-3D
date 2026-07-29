import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SceneErrorBoundary } from "@/components/cube/SceneErrorBoundary";
import { SceneFallback } from "@/components/cube/SceneFallback";

const PURCHASE_HREF = "https://wa.me/595982064334?text=Quiero%20comprar%20el%20cubo";

afterEach(cleanup);

describe("SceneFallback", () => {
  it("keeps a localized explanation, poster and purchase link usable without WebGL", () => {
    render(<SceneFallback purchaseHref={PURCHASE_HREF} reason="webgl" />);

    expect(
      screen.getByRole("heading", { name: "Tu navegador no puede mostrar el cubo 3D" }),
    ).toBeVisible();
    expect(
      screen.getByText(/Puedes ver una vista previa y comprar el cubo igualmente/i),
    ).toBeVisible();
    expect(screen.getByRole("img", { name: "Vista previa del Cubo Mágico 3D" })).toHaveAttribute(
      "src",
      "/cube-poster.svg",
    );
    expect(screen.getByRole("link", { name: "Comprar por WhatsApp" })).toHaveAttribute(
      "href",
      PURCHASE_HREF,
    );
  });

  it("retries a localized scene error and remounts the child successfully", async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let shouldThrow = true;

    function ThrowsOnce() {
      if (shouldThrow) {
        throw new Error("synthetic WebGL crash");
      }

      return <p>Escena recuperada</p>;
    }

    render(
      <SceneErrorBoundary
        onRetry={() => {
          shouldThrow = false;
        }}
        purchaseHref={PURCHASE_HREF}
      >
        <ThrowsOnce />
      </SceneErrorBoundary>,
    );

    expect(
      screen.getByRole("heading", { name: "No pudimos cargar el cubo 3D" }),
    ).toBeVisible();
    expect(screen.getByRole("img", { name: "Vista previa del Cubo Mágico 3D" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Comprar por WhatsApp" })).toHaveAttribute(
      "href",
      PURCHASE_HREF,
    );

    await user.click(screen.getByRole("button", { name: "Reintentar escena 3D" }));

    expect(screen.getByText("Escena recuperada")).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "No pudimos cargar el cubo 3D" }),
    ).not.toBeInTheDocument();
    consoleError.mockRestore();
  });
});
