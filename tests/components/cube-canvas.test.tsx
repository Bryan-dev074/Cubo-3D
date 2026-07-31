import { cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CubeCanvas, detectWebGL } from "@/components/cube/CubeCanvas";
import { ORBIT_MOUSE_BUTTONS } from "@/components/cube/CubeScene";
import { createSolvedCube } from "@/lib/cube/state";
import { MOUSE } from "three";
import type { IntroPhase } from "@/lib/motion/intro-sequence";
import {
  cursorIntentForMove,
  type CursorIntent,
} from "@/lib/motion/cursor-intent";

const dynamicMockState = vi.hoisted(() => ({ loaded: true }));

vi.mock("next/dynamic", () => ({
  default: (
    _loader: unknown,
    options: { readonly loading?: () => ReactNode },
  ) =>
    function TestDynamicScene({
      introPhase,
      onCursorIntentChange,
      onDropComplete,
      onSceneReady,
    }: {
      readonly introPhase?: IntroPhase;
      readonly onCursorIntentChange?: (intent: CursorIntent) => void;
      readonly onDropComplete?: () => void;
      readonly onSceneReady?: () => void;
    }) {
      if (!dynamicMockState.loaded) {
        const Loading = options.loading;
        return Loading ? <Loading /> : null;
      }
      return (
        <div data-intro-phase={introPhase} data-testid="dynamic-cube-scene">
          Escena WebGL
          <button type="button" onClick={onSceneReady}>
            Escena lista
          </button>
          <button type="button" onClick={onDropComplete}>
            Caída completa
          </button>
          <button
            type="button"
            onClick={() =>
              onCursorIntentChange?.(
                cursorIntentForMove({ axis: "y", layer: 0, turns: 1 }),
              )
            }
          >
            Cursor de escena
          </button>
        </div>
      );
    },
}));

const PURCHASE_HREF = "https://wa.me/595982064334?text=Comprar";

afterEach(() => {
  cleanup();
  dynamicMockState.loaded = true;
  vi.restoreAllMocks();
});

describe("CubeCanvas", () => {
  it("maps both primary mouse buttons to orbit when no cubie claims the pointer", () => {
    expect(ORBIT_MOUSE_BUTTONS).toMatchObject({
      LEFT: MOUSE.ROTATE,
      RIGHT: MOUSE.ROTATE,
    });
  });

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
    const onSceneError = vi.fn();

    render(
      <CubeCanvas
        cube={createSolvedCube()}
        onMoveComplete={vi.fn()}
        onMoveRequest={vi.fn()}
        onSceneError={onSceneError}
        purchaseHref={PURCHASE_HREF}
        queue={[]}
        webGLDetector={webGLDetector}
      />,
    );

    expect(webGLDetector).toHaveBeenCalledOnce();
    expect(screen.getByRole("heading", { name: "Tu navegador no puede mostrar el cubo 3D" }))
      .toBeVisible();
    expect(screen.queryByTestId("dynamic-cube-scene")).not.toBeInTheDocument();
    expect(onSceneError).toHaveBeenCalledOnce();
    expect(onSceneError).toHaveBeenCalledWith("webgl");
  });

  it("forwards the intro handshake through the dynamic scene boundary", async () => {
    const user = userEvent.setup();
    const onDropComplete = vi.fn();
    const onSceneReady = vi.fn();

    render(
      <CubeCanvas
        cube={createSolvedCube()}
        introPhase="drop"
        onDropComplete={onDropComplete}
        onMoveComplete={vi.fn()}
        onMoveRequest={vi.fn()}
        onSceneReady={onSceneReady}
        purchaseHref={PURCHASE_HREF}
        queue={[]}
        webGLDetector={() => true}
      />,
    );

    expect(screen.getByTestId("dynamic-cube-scene")).toHaveAttribute(
      "data-intro-phase",
      "drop",
    );
    await user.click(screen.getByRole("button", { name: "Escena lista" }));
    await user.click(screen.getByRole("button", { name: "Caída completa" }));

    expect(onSceneReady).toHaveBeenCalledOnce();
    expect(onDropComplete).toHaveBeenCalledOnce();
  });

  it("forwards normalized cursor intent through the dynamic scene boundary", async () => {
    const user = userEvent.setup();
    const onCursorIntentChange = vi.fn();

    render(
      <CubeCanvas
        cube={createSolvedCube()}
        onCursorIntentChange={onCursorIntentChange}
        onMoveComplete={vi.fn()}
        onMoveRequest={vi.fn()}
        purchaseHref={PURCHASE_HREF}
        queue={[]}
        webGLDetector={() => true}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cursor de escena" }));
    expect(onCursorIntentChange).toHaveBeenCalledOnce();
    expect(onCursorIntentChange).toHaveBeenCalledWith({
      axis: "y",
      direction: "positive",
      mode: "layer-drag",
    });
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

  it("keeps the delayed dynamic loading poster localized in Portuguese", () => {
    dynamicMockState.loaded = false;

    render(
      <CubeCanvas
        cube={createSolvedCube()}
        locale="pt"
        onMoveComplete={vi.fn()}
        onMoveRequest={vi.fn()}
        purchaseHref={PURCHASE_HREF}
        queue={[]}
        webGLDetector={() => true}
      />,
    );

    expect(
      screen.getByRole("img", { name: "Prévia do Cubo Mágico 3D" }),
    ).toHaveAttribute("src", "/cube-poster.svg");
    expect(
      screen.queryByRole("img", {
        name: "Vista previa del Cubo Mágico 3D",
      }),
    ).not.toBeInTheDocument();
  });
});
