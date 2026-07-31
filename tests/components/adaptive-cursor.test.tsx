import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdaptiveCursor } from "@/components/experience/AdaptiveCursor";
import {
  IDLE_CURSOR_INTENT,
  LAYER_READY_CURSOR_INTENT,
  cursorIntentForMove,
} from "@/lib/motion/cursor-intent";

describe("AdaptiveCursor", () => {
  let media: ReturnType<typeof installMediaQueries>;
  let frames: ReturnType<typeof installAnimationFrames>;
  let originalVisibility: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalVisibility = Object.getOwnPropertyDescriptor(
      document,
      "visibilityState",
    );
    media = installMediaQueries({ fine: true, reduced: false });
    frames = installAnimationFrames();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (originalVisibility) {
      Object.defineProperty(document, "visibilityState", originalVisibility);
    } else {
      delete (document as { visibilityState?: DocumentVisibilityState })
        .visibilityState;
    }
  });

  it("mounts before reporting readiness and moves imperatively with one frame", () => {
    const reports: boolean[] = [];
    render(
      <AdaptiveCursor
        intent={LAYER_READY_CURSOR_INTENT}
        onMounted={(mounted) => {
          if (mounted) {
            expect(screen.getByTestId("adaptive-cursor")).toBeInTheDocument();
          }
          reports.push(mounted);
        }}
        paused={false}
      />,
    );
    const cursor = screen.getByTestId("adaptive-cursor");

    fireEvent.pointerMove(window, {
      clientX: 40,
      clientY: 30,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(window, {
      clientX: 120,
      clientY: 80,
      pointerType: "mouse",
    });

    expect(frames.request).toHaveBeenCalledTimes(1);
    expect(cursor.style.transform).toBe("");
    frames.flush();
    expect(cursor).toHaveAttribute("data-mode", "layer-ready");
    expect(cursor).toHaveAttribute("data-visible", "true");
    expect(cursor.getAttribute("style")).toContain(
      "translate3d(120px, 80px, 0)",
    );
    expect(cursor).toHaveStyle({ pointerEvents: "none" });
    expect(reports).toEqual([true]);
  });

  it("keeps layer drag and orbit above action hover", () => {
    const { rerender } = render(
      <button type="button">
        Comprar
        <AdaptiveCursor
          intent={cursorIntentForMove({ axis: "z", layer: 1, turns: -1 })}
          paused={false}
        />
      </button>,
    );
    const cursor = screen.getByTestId("adaptive-cursor");
    const button = screen.getByRole("button");

    fireEvent.pointerMove(button, {
      clientX: 24,
      clientY: 32,
      pointerType: "mouse",
    });
    expect(cursor).toHaveAttribute("data-mode", "layer-drag");
    expect(cursor).toHaveAttribute("data-axis", "z");
    expect(cursor).toHaveAttribute("data-direction", "negative");

    rerender(
      <button type="button">
        Comprar
        <AdaptiveCursor intent={{ mode: "orbit" }} paused={false} />
      </button>,
    );
    expect(cursor).toHaveAttribute("data-mode", "orbit");
  });

  it("uses action over controls and restores the external idle intent elsewhere", () => {
    render(
      <div data-testid="surface">
        <button type="button">Comprar</button>
        <AdaptiveCursor intent={IDLE_CURSOR_INTENT} paused={false} />
      </div>,
    );
    const cursor = screen.getByTestId("adaptive-cursor");

    fireEvent.pointerMove(screen.getByRole("button"), {
      clientX: 10,
      clientY: 12,
      pointerType: "mouse",
    });
    expect(cursor).toHaveAttribute("data-mode", "action");

    fireEvent.pointerMove(screen.getByTestId("surface"), {
      clientX: 14,
      clientY: 16,
      pointerType: "mouse",
    });
    expect(cursor).toHaveAttribute("data-mode", "idle");
  });

  it("keeps enabled actions above cube-ready and cube-disabled hover", () => {
    const { rerender } = render(
      <button type="button">
        Comprar
        <AdaptiveCursor intent={LAYER_READY_CURSOR_INTENT} paused={false} />
      </button>,
    );
    const cursor = screen.getByTestId("adaptive-cursor");
    const button = screen.getByRole("button");

    fireEvent.pointerMove(button, {
      clientX: 16,
      clientY: 18,
      pointerType: "mouse",
    });
    expect(cursor).toHaveAttribute("data-mode", "action");

    rerender(
      <button type="button">
        Comprar
        <AdaptiveCursor intent={{ mode: "disabled" }} paused={false} />
      </button>,
    );
    expect(cursor).toHaveAttribute("data-mode", "action");
  });

  it("does not advertise action on disabled controls", () => {
    render(
      <button disabled type="button">
        Desordenar
        <AdaptiveCursor intent={{ mode: "disabled" }} paused={false} />
      </button>,
    );
    const cursor = screen.getByTestId("adaptive-cursor");

    fireEvent.pointerMove(screen.getByRole("button"), {
      clientX: 20,
      clientY: 22,
      pointerType: "mouse",
    });

    expect(cursor).toHaveAttribute("data-mode", "disabled");
  });

  it("does not advertise orbit while the cube is disabled", () => {
    render(
      <div id="cube-stage" data-testid="disabled-stage">
        <AdaptiveCursor intent={{ mode: "disabled" }} paused={false} />
      </div>,
    );
    const cursor = screen.getByTestId("adaptive-cursor");

    fireEvent.pointerDown(screen.getByTestId("disabled-stage"), {
      button: 2,
      buttons: 2,
      clientX: 30,
      clientY: 32,
      pointerId: 12,
      pointerType: "mouse",
    });

    expect(cursor).toHaveAttribute("data-mode", "disabled");
  });

  it("owns right-button orbit inside the cube stage until release", () => {
    render(
      <div id="cube-stage">
        <button type="button">Stage action</button>
        <AdaptiveCursor intent={IDLE_CURSOR_INTENT} paused={false} />
      </div>,
    );
    const cursor = screen.getByTestId("adaptive-cursor");
    const action = screen.getByRole("button");

    fireEvent.pointerDown(action, {
      button: 2,
      buttons: 2,
      clientX: 50,
      clientY: 60,
      pointerId: 7,
      pointerType: "mouse",
    });
    expect(cursor).toHaveAttribute("data-mode", "orbit");

    fireEvent.pointerMove(action, {
      buttons: 2,
      clientX: 55,
      clientY: 65,
      pointerId: 7,
      pointerType: "mouse",
    });
    expect(cursor).toHaveAttribute("data-mode", "orbit");

    fireEvent.pointerUp(action, {
      button: 2,
      buttons: 0,
      pointerId: 7,
      pointerType: "mouse",
    });
    expect(cursor).toHaveAttribute("data-mode", "action");
  });

  it("does not mount for coarse pointers or reduced motion and follows live changes", () => {
    const onMounted = vi.fn();
    const { rerender } = render(
      <AdaptiveCursor
        intent={IDLE_CURSOR_INTENT}
        onMounted={onMounted}
        paused={false}
      />,
    );
    expect(screen.getByTestId("adaptive-cursor")).toBeInTheDocument();
    expect(onMounted).toHaveBeenLastCalledWith(true);

    act(() => media.fine.setMatches(false));
    expect(screen.queryByTestId("adaptive-cursor")).not.toBeInTheDocument();
    expect(onMounted).toHaveBeenLastCalledWith(false);

    act(() => media.fine.setMatches(true));
    expect(screen.getByTestId("adaptive-cursor")).toBeInTheDocument();

    act(() => media.reduced.setMatches(true));
    expect(screen.queryByTestId("adaptive-cursor")).not.toBeInTheDocument();
    expect(onMounted).toHaveBeenLastCalledWith(false);

    act(() => media.reduced.setMatches(false));
    rerender(
      <AdaptiveCursor
        intent={IDLE_CURSOR_INTENT}
        onMounted={onMounted}
        paused={false}
      />,
    );
    expect(screen.getByTestId("adaptive-cursor")).toBeInTheDocument();
  });

  it("keeps the native cursor when matchMedia is unavailable", () => {
    vi.stubGlobal("matchMedia", undefined);

    render(<AdaptiveCursor intent={IDLE_CURSOR_INTENT} paused={false} />);

    expect(screen.queryByTestId("adaptive-cursor")).not.toBeInTheDocument();
  });

  it("ignores touch on hybrid hardware and revives only for a fine pointer", () => {
    render(<AdaptiveCursor intent={IDLE_CURSOR_INTENT} paused={false} />);
    const cursor = screen.getByTestId("adaptive-cursor");

    fireEvent.pointerMove(window, {
      clientX: 90,
      clientY: 100,
      pointerType: "mouse",
    });
    frames.flush();
    expect(cursor).toHaveAttribute("data-visible", "true");

    fireEvent.pointerMove(window, {
      clientX: 200,
      clientY: 210,
      pointerType: "touch",
    });
    expect(cursor).toHaveAttribute("data-visible", "false");
    expect(frames.pending()).toBe(0);
    expect(cursor.getAttribute("style")).toContain(
      "translate3d(90px, 100px, 0)",
    );

    fireEvent.pointerMove(window, {
      clientX: 110,
      clientY: 120,
      pointerType: "pen",
    });
    frames.flush();
    expect(cursor).toHaveAttribute("data-visible", "true");
    expect(cursor.getAttribute("style")).toContain(
      "translate3d(110px, 120px, 0)",
    );
  });

  it("clears a stale gesture on pointer cancel, blur, leave, and hidden visibility", () => {
    let visibility: DocumentVisibilityState = "visible";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibility,
    });
    const { rerender } = render(
      <AdaptiveCursor
        intent={cursorIntentForMove({ axis: "x", layer: 0, turns: 1 })}
        paused={false}
      />,
    );
    const cursor = screen.getByTestId("adaptive-cursor");

    fireEvent.pointerMove(window, {
      clientX: 30,
      clientY: 40,
      pointerType: "mouse",
    });
    fireEvent.pointerCancel(window, { pointerType: "mouse" });
    expect(cursor).toHaveAttribute("data-mode", "idle");
    expect(cursor).toHaveAttribute("data-visible", "false");

    rerender(
      <AdaptiveCursor intent={LAYER_READY_CURSOR_INTENT} paused={false} />,
    );
    fireEvent.pointerMove(window, {
      clientX: 31,
      clientY: 41,
      pointerType: "mouse",
    });
    expect(cursor).toHaveAttribute("data-mode", "layer-ready");
    fireEvent.blur(window);
    expect(cursor).toHaveAttribute("data-mode", "idle");
    expect(cursor).toHaveAttribute("data-visible", "false");

    fireEvent.pointerMove(window, {
      clientX: 32,
      clientY: 42,
      pointerType: "mouse",
    });
    fireEvent.pointerLeave(document, { pointerType: "mouse" });
    expect(cursor).toHaveAttribute("data-visible", "false");

    fireEvent.pointerMove(window, {
      clientX: 33,
      clientY: 43,
      pointerType: "mouse",
    });
    visibility = "hidden";
    fireEvent(document, new Event("visibilitychange"));
    expect(cursor).toHaveAttribute("data-mode", "idle");
    expect(cursor).toHaveAttribute("data-visible", "false");
  });

  it("keeps disabled priority while paused", () => {
    render(
      <button type="button">
        Comprar
        <AdaptiveCursor intent={IDLE_CURSOR_INTENT} paused />
      </button>,
    );
    const cursor = screen.getByTestId("adaptive-cursor");

    fireEvent.pointerMove(screen.getByRole("button"), {
      clientX: 70,
      clientY: 80,
      pointerType: "mouse",
    });
    expect(cursor).toHaveAttribute("data-mode", "disabled");
  });

  it("cancels its only pending frame and detaches listeners on unmount", () => {
    const removeWindowListener = vi.spyOn(window, "removeEventListener");
    const removeDocumentListener = vi.spyOn(document, "removeEventListener");
    const onMounted = vi.fn();
    const { unmount } = render(
      <AdaptiveCursor
        intent={IDLE_CURSOR_INTENT}
        onMounted={onMounted}
        paused={false}
      />,
    );

    fireEvent.pointerMove(window, {
      clientX: 80,
      clientY: 90,
      pointerType: "mouse",
    });
    expect(frames.pending()).toBe(1);
    unmount();

    expect(frames.cancel).toHaveBeenCalledTimes(1);
    expect(frames.pending()).toBe(0);
    expect(removeWindowListener).toHaveBeenCalledWith(
      "pointermove",
      expect.any(Function),
    );
    expect(removeWindowListener).toHaveBeenCalledWith(
      "pointercancel",
      expect.any(Function),
    );
    expect(removeWindowListener).toHaveBeenCalledWith(
      "blur",
      expect.any(Function),
    );
    expect(removeDocumentListener).toHaveBeenCalledWith(
      "pointerleave",
      expect.any(Function),
    );
    expect(removeDocumentListener).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
    expect(onMounted).toHaveBeenLastCalledWith(false);

    const requestCount = frames.request.mock.calls.length;
    fireEvent.pointerMove(window, {
      clientX: 100,
      clientY: 110,
      pointerType: "mouse",
    });
    expect(frames.request).toHaveBeenCalledTimes(requestCount);
  });
});

function createMediaQueryList(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  return {
    get matches() {
      return matches;
    },
    media: "",
    onchange: null,
    addEventListener: (
      _type: string,
      listener: (event: MediaQueryListEvent) => void,
    ) => listeners.add(listener),
    removeEventListener: (
      _type: string,
      listener: (event: MediaQueryListEvent) => void,
    ) => listeners.delete(listener),
    addListener: (listener: (event: MediaQueryListEvent) => void) =>
      listeners.add(listener),
    removeListener: (listener: (event: MediaQueryListEvent) => void) =>
      listeners.delete(listener),
    dispatchEvent: () => true,
    setMatches(nextMatches: boolean) {
      matches = nextMatches;
      for (const listener of listeners) {
        listener({ matches } as MediaQueryListEvent);
      }
    },
  } as unknown as MediaQueryList & { setMatches(matches: boolean): void };
}

function installMediaQueries({
  fine,
  reduced,
}: {
  fine: boolean;
  reduced: boolean;
}) {
  const fineQuery = createMediaQueryList(fine);
  const reducedQuery = createMediaQueryList(reduced);

  vi.stubGlobal("matchMedia", (query: string) =>
    query.includes("prefers-reduced-motion") ? reducedQuery : fineQuery,
  );

  return { fine: fineQuery, reduced: reducedQuery };
}

function installAnimationFrames() {
  let nextFrame = 1;
  const callbacks = new Map<number, FrameRequestCallback>();
  const request = vi.fn((callback: FrameRequestCallback) => {
    const frame = nextFrame;
    nextFrame += 1;
    callbacks.set(frame, callback);
    return frame;
  });
  const cancel = vi.fn((frame: number) => callbacks.delete(frame));
  vi.stubGlobal("requestAnimationFrame", request);
  vi.stubGlobal("cancelAnimationFrame", cancel);

  return {
    cancel,
    pending: () => callbacks.size,
    request,
    flush() {
      const active = [...callbacks.values()];
      callbacks.clear();
      for (const callback of active) {
        callback(performance.now());
      }
    },
  };
}
