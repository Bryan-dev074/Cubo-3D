import { cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CubeCanvas, detectWebGL } from "@/components/cube/CubeCanvas";
import { createSolvedCube } from "@/lib/cube/state";

vi.mock("next/dynamic", () => ({
  default: () =>
    function TestDynamicScene() {
      return <div data-testid="dynamic-cube-scene">Escena WebGL</div>;
    },
}));

const PURCHASE_HREF = "https://wa.me/595982064334?text=Comprar";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CubeCanvas", () => {
  it("uses the same loading poster on the server before client WebGL detection", () => {
    const webGLDetector = vi.fn(() => true);

    const html = renderToString(
      <CubeCanvas
        cube={createSolvedCube()}
        onMoveComplete={vi.fn()}
        onMoveRequest={vi.fn()}
        purchaseHref={PURCHASE_HREF}
        queue={[]}
        webGLDetector={webGLDetector}
      />,
    );

    expect(html).toContain("cube-poster.svg");
    expect(webGLDetector).not.toHaveBeenCalled();
  });

  it("accepts an available WebGL2 context without rejecting software-backed browsers", () => {
    const context = {} as WebGL2RenderingContext;
    const getContext = vi.fn(() => context);
    const createElement = vi
      .spyOn(document, "createElement")
      .mockReturnValue({ getContext } as unknown as HTMLCanvasElement);

    expect(detectWebGL()).toBe(true);
    expect(getContext).toHaveBeenCalledWith("webgl2");

    createElement.mockRestore();
  });

  it("checks injected WebGL support before mounting the client-only scene", () => {
    const webGLDetector = vi.fn(() => false);

    render(
      <CubeCanvas
        cube={createSolvedCube()}
        onMoveComplete={vi.fn()}
        onMoveRequest={vi.fn()}
        purchaseHref={PURCHASE_HREF}
        queue={[]}
        webGLDetector={webGLDetector}
      />,
    );

    expect(webGLDetector).toHaveBeenCalledOnce();
    expect(screen.getByRole("heading", { name: "Tu navegador no puede mostrar el cubo 3D" }))
      .toBeVisible();
    expect(screen.queryByTestId("dynamic-cube-scene")).not.toBeInTheDocument();
  });

  it("retries WebGL detection, preserves the purchase CTA and mounts the recovered scene", async () => {
    const user = userEvent.setup();
    const webGLDetector = vi
      .fn<() => boolean>()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    render(
      <CubeCanvas
        cube={createSolvedCube()}
        onMoveComplete={vi.fn()}
        onMoveRequest={vi.fn()}
        purchaseHref={PURCHASE_HREF}
        queue={[]}
        webGLDetector={webGLDetector}
      />,
    );

    expect(screen.getByRole("link", { name: "Comprar por WhatsApp" })).toHaveAttribute(
      "href",
      PURCHASE_HREF,
    );
    await user.click(screen.getByRole("button", { name: "Reintentar escena 3D" }));

    expect(webGLDetector).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("dynamic-cube-scene")).toBeVisible();
  });

  it("mounts the dynamically loaded scene only when injected WebGL support succeeds", () => {
    const webGLDetector = vi.fn(() => true);

    render(
      <CubeCanvas
        cube={createSolvedCube()}
        onMoveComplete={vi.fn()}
        onMoveRequest={vi.fn()}
        purchaseHref={PURCHASE_HREF}
        queue={[]}
        webGLDetector={webGLDetector}
      />,
    );

    expect(webGLDetector).toHaveBeenCalledOnce();
    expect(screen.getByTestId("dynamic-cube-scene")).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Tu navegador no puede mostrar el cubo 3D" }),
    ).not.toBeInTheDocument();
  });
});
