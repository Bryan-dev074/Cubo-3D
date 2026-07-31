import {
  cleanup,
  fireEvent,
  render,
  screen,
  act,
} from "@testing-library/react";
import { useIntroSequence } from "@/components/experience/useIntroSequence";
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PackageIntro } from "@/components/experience/PackageIntro";

describe("PackageIntro", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (document as { visibilityState?: string }).visibilityState;
  });

  it("renders the complete decorative mechanical package", () => {
    const onPackageOpened = vi.fn();
    render(
      <PackageIntro
        phase="opening"
        reducedMotion={false}
        onPackageOpened={onPackageOpened}
      />,
    );
    const intro = screen.getByTestId("package-intro");

    expect(intro).toHaveAttribute("aria-hidden", "true");
    expect(intro).toHaveAttribute("data-phase", "opening");
    expect(screen.getByTestId("package-shell")).toBeInTheDocument();
    expect(screen.getByTestId("package-inner-face")).toBeInTheDocument();
    expect(screen.getByTestId("package-aperture")).toBeInTheDocument();
    expect(screen.getByTestId("package-spine")).toBeInTheDocument();
    expect(screen.getByTestId("package-serial")).toHaveTextContent(
      "CM3D / 03",
    );
    expect(screen.getAllByTestId("package-registration")).toHaveLength(4);
    expect(
      screen
        .getAllByTestId("package-registration")
        .map((mark) => mark.getAttribute("data-registration")),
    ).toEqual(["nw", "ne", "se", "sw"]);
    expect(screen.getAllByTestId("package-rail")).toHaveLength(2);
    expect(screen.getAllByTestId("package-hinge")).toHaveLength(4);
    expect(screen.getAllByTestId("package-intro-flap")).toHaveLength(4);
    expect(screen.getAllByTestId("package-flap-print")).toHaveLength(4);
    expect(screen.getAllByTestId("package-flap-edge")).toHaveLength(4);
    expect(screen.getByTestId("package-seal")).toBeInTheDocument();
  });

  it("accepts only the finish animation and completes once", () => {
    const onPackageOpened = vi.fn();
    const { rerender } = render(
      <PackageIntro
        phase="opening"
        reducedMotion={false}
        onPackageOpened={onPackageOpened}
      />,
    );
    const timeline = screen.getByTestId("package-intro-timeline");
    fireTimelineAnimationEnd(timeline, "package-intro-open");
    expect(onPackageOpened).not.toHaveBeenCalled();
    fireTimelineAnimationEnd(timeline, "package-intro-reveal");
    expect(onPackageOpened).not.toHaveBeenCalled();
    fireTimelineAnimationEnd(timeline, "intro-package-finish");
    fireTimelineAnimationEnd(timeline, "intro-package-finish");
    expect(onPackageOpened).toHaveBeenCalledTimes(1);

    rerender(
      <PackageIntro
        phase="ready"
        reducedMotion={false}
        onPackageOpened={onPackageOpened}
      />,
    );
    expect(screen.queryByTestId("package-intro")).not.toBeInTheDocument();
    fireTimelineAnimationEnd(timeline, "intro-package-finish");
    expect(onPackageOpened).toHaveBeenCalledTimes(1);
  });

  it("accepts the reduced package completion animation once", () => {
    const onPackageOpened = vi.fn();
    render(
      <PackageIntro
        phase="opening"
        reducedMotion
        onPackageOpened={onPackageOpened}
      />,
    );

    const timeline = screen.getByTestId("package-intro-timeline");
    fireTimelineAnimationEnd(timeline, "package-intro-reduced");
    fireTimelineAnimationEnd(timeline, "package-intro-reduced");
    expect(onPackageOpened).toHaveBeenCalledOnce();
  });

  it("accepts only CSS-module-qualified versions of the approved names", () => {
    const onPackageOpened = vi.fn();
    const first = render(
      <PackageIntro
        phase="opening"
        reducedMotion={false}
        onPackageOpened={onPackageOpened}
      />,
    );

    fireTimelineAnimationEnd(
      screen.getByTestId("package-intro-timeline"),
      "experience-module__hash__intro-package-finish",
    );
    expect(onPackageOpened).toHaveBeenCalledOnce();
    first.unmount();

    const onReducedOpened = vi.fn();
    render(
      <PackageIntro
        phase="opening"
        reducedMotion
        onPackageOpened={onReducedOpened}
      />,
    );
    fireTimelineAnimationEnd(
      screen.getByTestId("package-intro-timeline"),
      "package-intro-reduced__experience-module__hash",
    );
    expect(onReducedOpened).toHaveBeenCalledOnce();
  });

  it("lets Escape skip the finite sequence", () => {
    render(<IntroSequenceProbe />);

    expect(screen.getByTestId("intro-phase")).toHaveTextContent("opening");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByTestId("intro-phase")).toHaveTextContent("ready");
  });

  it("lets Tab skip the finite sequence", () => {
    render(<IntroSequenceProbe />);

    expect(screen.getByTestId("intro-phase")).toHaveTextContent("opening");
    fireEvent.keyDown(window, { key: "Tab" });
    expect(screen.getByTestId("intro-phase")).toHaveTextContent("ready");
  });

  it("keeps a hydration-safe server snapshot before reading a reduced preference", () => {
    const media = createMediaQueryList(true);
    vi.stubGlobal("matchMedia", () => media);

    const serverMarkup = renderToString(<IntroSequenceProbe />);
    expect(serverMarkup).toContain('data-reduced-motion="false"');

    render(<IntroSequenceProbe />);
    expect(screen.getByTestId("intro-phase")).toHaveAttribute(
      "data-reduced-motion",
      "true",
    );
  });

  it("uses 180 ms for an initially reduced preference and reaches ready", () => {
    const clock = installFrameClock();
    const media = createMediaQueryList(true);
    vi.stubGlobal("matchMedia", () => media);

    render(<IntroSequenceProbe />);

    act(() => {
      clock.frame(0);
      clock.frame(50);
      clock.frame(100);
      clock.frame(150);
      clock.frame(200);
    });
    expect(screen.getByTestId("intro-phase")).toHaveTextContent("ready");
  });

  it("skips safely when the motion preference changes during opening", () => {
    const media = createMediaQueryList(false);
    vi.stubGlobal("matchMedia", () => media);
    render(<IntroSequenceProbe />);

    act(() => media.setMatches(true));
    expect(screen.getByTestId("intro-phase")).toHaveTextContent("ready");
  });

  it("counts watchdog time only while the document is visible", () => {
    const clock = installFrameClock();
    let visibility = "visible";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibility,
    });
    render(<IntroSequenceProbe />);

    act(() => {
      clock.frame(0);
      for (let time = 50; time <= 1300; time += 50) {
        clock.frame(time);
      }
    });
    expect(screen.getByTestId("intro-phase")).toHaveTextContent("opening");

    visibility = "hidden";
    clock.setNow(10_000);
    visibility = "visible";
    fireEvent(document, new Event("visibilitychange"));
    act(() => clock.frame(10_010));

    expect(screen.getByTestId("intro-phase")).toHaveTextContent("opening");
    act(() => clock.frame(10_050));
    expect(screen.getByTestId("intro-phase")).toHaveTextContent("reveal");
  });

  it("keeps reveal to 650 ms of visible time when the scene never mounts", () => {
    const clock = installFrameClock();
    let visibility = "visible";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibility,
    });
    render(<IntroSequenceProbe />);

    act(() => {
      clock.frame(0);
      for (let time = 50; time <= 1_350; time += 50) {
        clock.frame(time);
      }
    });
    expect(screen.getByTestId("intro-phase")).toHaveTextContent("reveal");

    visibility = "hidden";
    fireEvent(document, new Event("visibilitychange"));
    clock.setNow(12_000);
    act(() => clock.frame(12_000));
    expect(screen.getByTestId("intro-phase")).toHaveTextContent("reveal");

    visibility = "visible";
    clock.setNow(12_000);
    fireEvent(document, new Event("visibilitychange"));
    act(() => {
      for (let time = 12_050; time <= 12_600; time += 50) {
        clock.frame(time);
      }
    });
    expect(screen.getByTestId("intro-phase")).toHaveTextContent("reveal");

    act(() => clock.frame(12_650));
    expect(screen.getByTestId("intro-phase")).toHaveTextContent("ready");
  });

  it("reaches ready by two seconds of visible wall-clock time under sparse frames", () => {
    const clock = installFrameClock();
    render(<IntroSequenceProbe />);

    act(() => {
      clock.frame(0);
      clock.frame(1_350);
    });
    expect(screen.getByTestId("intro-phase")).toHaveTextContent("reveal");

    act(() => clock.frame(2_000));
    expect(screen.getByTestId("intro-phase")).toHaveTextContent("ready");
  });

  it("commits the last visible interval on hide without counting hidden time twice", () => {
    const clock = installFrameClock();
    let visibility = "visible";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibility,
    });
    render(<IntroSequenceProbe />);

    act(() => clock.frame(0));
    clock.setNow(1_300);
    visibility = "hidden";
    fireEvent(document, new Event("visibilitychange"));

    clock.setNow(10_000);
    visibility = "visible";
    fireEvent(document, new Event("visibilitychange"));
    act(() => clock.frame(10_049));
    expect(screen.getByTestId("intro-phase")).toHaveTextContent("opening");

    act(() => clock.frame(10_050));
    expect(screen.getByTestId("intro-phase")).toHaveTextContent("reveal");

    clock.setNow(10_699);
    visibility = "hidden";
    fireEvent(document, new Event("visibilitychange"));
    clock.setNow(20_000);
    visibility = "visible";
    fireEvent(document, new Event("visibilitychange"));
    act(() => clock.frame(20_000));
    expect(screen.getByTestId("intro-phase")).toHaveTextContent("reveal");

    act(() => clock.frame(20_001));
    expect(screen.getByTestId("intro-phase")).toHaveTextContent("ready");
  });

  it("ends reveal immediately when the late scene reports its mounted root", () => {
    const clock = installFrameClock();
    render(<IntroSequenceProbe />);

    act(() => {
      clock.frame(0);
      for (let time = 50; time <= 1_350; time += 50) {
        clock.frame(time);
      }
    });
    expect(screen.getByTestId("intro-phase")).toHaveTextContent("reveal");

    fireEvent.click(screen.getByRole("button", { name: "Escena montada" }));
    expect(screen.getByTestId("intro-phase")).toHaveTextContent("ready");
  });

  it("keeps one watchdog in StrictMode and removes it with its visibility listener", () => {
    const clock = installFrameClock();
    const removeEventListener = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(
      <StrictMode>
        <IntroSequenceProbe />
      </StrictMode>,
    );

    expect(clock.pending()).toBe(1);
    unmount();
    expect(clock.cancel).toHaveBeenCalled();
    expect(removeEventListener).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
  });
});

function IntroSequenceProbe() {
  const intro = useIntroSequence();

  return (
    <>
      <output
        data-reduced-motion={String(intro.reducedMotion)}
        data-testid="intro-phase"
      >
        {intro.phase}
      </output>
      <button type="button" onClick={intro.markSceneReady}>
        Escena montada
      </button>
    </>
  );
}

function fireTimelineAnimationEnd(element: HTMLElement, animationName: string) {
  const event = new Event("animationend", { bubbles: true });
  Object.defineProperty(event, "animationName", { value: animationName });
  fireEvent(element, event);
}

function createMediaQueryList(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  return {
    get matches() {
      return matches;
    },
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
    addListener: (listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeListener: (listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
    dispatchEvent: () => true,
    setMatches(nextMatches: boolean) {
      matches = nextMatches;
      for (const listener of listeners) {
        listener({ matches } as MediaQueryListEvent);
      }
    },
  } as unknown as MediaQueryList & { setMatches(nextMatches: boolean): void };
}

function installFrameClock() {
  let currentTime = 0;
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
  vi.spyOn(performance, "now").mockImplementation(() => currentTime);

  return {
    cancel,
    frame(time: number) {
      currentTime = time;
      const active = [...callbacks.values()];
      callbacks.clear();
      for (const callback of active) {
        callback(time);
      }
    },
    pending: () => callbacks.size,
    setNow(time: number) {
      currentTime = time;
    },
  };
}
