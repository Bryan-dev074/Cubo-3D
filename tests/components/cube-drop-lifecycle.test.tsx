import { act, cleanup, render } from "@testing-library/react";
import { useLayoutEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useCubeDropTimeline } from "@/components/cube/useCubeDropTimeline";
import {
  sampleCubeDrop,
  type CubeDropSample,
} from "@/lib/motion/cube-drop";
import type { IntroPhase } from "@/lib/motion/intro-sequence";

const fiberState = vi.hoisted(() => ({
  frame: undefined as (() => void) | undefined,
}));

vi.mock("@react-three/fiber", () => ({
  useFrame: (callback: () => void) => {
    fiberState.frame = callback;
  },
}));

afterEach(() => {
  cleanup();
  fiberState.frame = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useCubeDropTimeline", () => {
  it("applies the airborne sample before the next layout observer can paint", () => {
    installFrameClock();
    const onSample = vi.fn<(sample: CubeDropSample) => void>();
    const observedDuringLayout = vi.fn();

    render(
      <PrePaintDropProbe
        observedDuringLayout={observedDuringLayout}
        onSample={onSample}
      />,
    );

    expect(observedDuringLayout).toHaveBeenCalledWith(sampleCubeDrop(0));
  });

  it("counts only visible time, resumes from the paused sample and completes once", () => {
    const clock = installFrameClock();
    const invalidate = vi.fn();
    const onComplete = vi.fn();
    const onSample = vi.fn<(sample: CubeDropSample) => void>();
    const { rerender } = render(
      <DropTimelineProbe
        introPhase="drop"
        invalidate={invalidate}
        onComplete={onComplete}
        onSample={onSample}
        pageVisible
      />,
    );

    expect(clock.pending()).toBe(1);
    runAnimationAndRenderFrame(clock, 200);
    const beforePause = lastSample(onSample);
    expect(onComplete).not.toHaveBeenCalled();

    rerender(
      <DropTimelineProbe
        introPhase="drop"
        invalidate={invalidate}
        onComplete={onComplete}
        onSample={onSample}
        pageVisible={false}
      />,
    );
    expect(clock.pending()).toBe(0);

    clock.setNow(5_000);
    act(() => fiberState.frame?.());
    expect(lastSample(onSample)).toEqual(beforePause);
    expect(onComplete).not.toHaveBeenCalled();

    rerender(
      <DropTimelineProbe
        introPhase="drop"
        invalidate={invalidate}
        onComplete={onComplete}
        onSample={onSample}
        pageVisible
      />,
    );
    runAnimationAndRenderFrame(clock, 5_400);
    expect(onComplete).not.toHaveBeenCalled();

    runAnimationAndRenderFrame(clock, 5_450);
    expect(lastSample(onSample)).toEqual({
      offsetY: 0,
      rotationX: 0,
      rotationZ: 0,
      shadowOpacity: 1,
      shadowScale: 1,
    });
    expect(onComplete).toHaveBeenCalledOnce();
    expect(clock.pending()).toBe(0);

    act(() => fiberState.frame?.());
    expect(onComplete).toHaveBeenCalledOnce();
    expect(clock.pending()).toBe(0);
  });

  it("cancels the finite invalidator when unmounted before landing", () => {
    const clock = installFrameClock();
    const onComplete = vi.fn();
    const { unmount } = render(
      <DropTimelineProbe
        introPhase="drop"
        invalidate={vi.fn()}
        onComplete={onComplete}
        onSample={vi.fn()}
        pageVisible
      />,
    );

    expect(clock.pending()).toBe(1);
    act(() => clock.animationFrame(120));
    expect(clock.pending()).toBe(1);

    unmount();
    expect(clock.cancel).toHaveBeenCalled();
    expect(clock.pending()).toBe(0);
    act(() => clock.animationFrame(1_000));
    expect(onComplete).not.toHaveBeenCalled();
  });
});

function PrePaintDropProbe({
  observedDuringLayout,
  onSample,
}: {
  readonly observedDuringLayout: (sample: CubeDropSample | undefined) => void;
  readonly onSample: (sample: CubeDropSample) => void;
}) {
  useCubeDropTimeline({
    introPhase: "drop",
    invalidate: vi.fn(),
    onSample,
    pageVisible: true,
    reducedMotion: false,
  });
  useLayoutEffect(() => {
    observedDuringLayout(
      (onSample as ReturnType<typeof vi.fn<(sample: CubeDropSample) => void>>)
        .mock.calls.at(-1)?.[0],
    );
  }, [observedDuringLayout, onSample]);
  return null;
}

function DropTimelineProbe({
  introPhase,
  invalidate,
  onComplete,
  onSample,
  pageVisible,
}: {
  readonly introPhase: IntroPhase;
  readonly invalidate: () => void;
  readonly onComplete: () => void;
  readonly onSample: (sample: CubeDropSample) => void;
  readonly pageVisible: boolean;
}) {
  useCubeDropTimeline({
    introPhase,
    invalidate,
    onComplete,
    onSample,
    pageVisible,
    reducedMotion: false,
  });
  return null;
}

function lastSample(
  onSample: ReturnType<typeof vi.fn<(sample: CubeDropSample) => void>>,
): CubeDropSample {
  const sample = onSample.mock.calls.at(-1)?.[0];
  if (!sample) {
    throw new Error("Expected the drop timeline to emit a sample");
  }
  return sample;
}

function runAnimationAndRenderFrame(
  clock: ReturnType<typeof installFrameClock>,
  time: number,
) {
  act(() => {
    clock.animationFrame(time);
    fiberState.frame?.();
  });
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
    animationFrame(time: number) {
      currentTime = time;
      const active = [...callbacks.values()];
      callbacks.clear();
      for (const callback of active) {
        callback(time);
      }
    },
    cancel,
    pending: () => callbacks.size,
    setNow(time: number) {
      currentTime = time;
    },
  };
}
