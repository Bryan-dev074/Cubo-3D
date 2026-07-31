import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useCelebrationTimeline } from "@/components/cube/useCelebrationTimeline";

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

describe("useCelebrationTimeline", () => {
  it("accumulates only visible time, resumes without a jump and completes once", () => {
    const clock = installFrameClock();
    const invalidate = vi.fn();
    const onComplete = vi.fn();
    const onSample = vi.fn<(progress: number) => void>();
    const { rerender } = render(
      <CelebrationTimelineProbe
        active
        invalidate={invalidate}
        onComplete={onComplete}
        onSample={onSample}
        pageVisible
      />,
    );

    expect(lastProgress(onSample)).toBe(0);
    expect(clock.pending()).toBe(1);
    runAnimationAndRenderFrame(clock, 200);
    const beforePause = lastProgress(onSample);
    expect(beforePause).toBeCloseTo(200 / 820);

    rerender(
      <CelebrationTimelineProbe
        active
        invalidate={invalidate}
        onComplete={onComplete}
        onSample={onSample}
        pageVisible={false}
      />,
    );
    expect(clock.pending()).toBe(0);
    clock.setNow(5_000);
    act(() => fiberState.frame?.());
    expect(lastProgress(onSample)).toBeCloseTo(beforePause);
    expect(onComplete).not.toHaveBeenCalled();

    rerender(
      <CelebrationTimelineProbe
        active
        invalidate={invalidate}
        onComplete={onComplete}
        onSample={onSample}
        pageVisible
      />,
    );
    runAnimationAndRenderFrame(clock, 5_500);
    expect(lastProgress(onSample)).toBeCloseTo(700 / 820);
    expect(onComplete).not.toHaveBeenCalled();

    runAnimationAndRenderFrame(clock, 5_620);
    expect(lastProgress(onSample)).toBe(1);
    expect(onComplete).toHaveBeenCalledOnce();
    expect(clock.pending()).toBe(0);

    act(() => fiberState.frame?.());
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("cancels its frame and restores the canonical sample when stopped", () => {
    const clock = installFrameClock();
    const onSample = vi.fn<(progress: number) => void>();
    const { rerender, unmount } = render(
      <CelebrationTimelineProbe
        active
        invalidate={vi.fn()}
        onSample={onSample}
        pageVisible
      />,
    );

    runAnimationAndRenderFrame(clock, 180);
    rerender(
      <CelebrationTimelineProbe
        active={false}
        invalidate={vi.fn()}
        onSample={onSample}
        pageVisible
      />,
    );
    expect(lastProgress(onSample)).toBe(1);
    expect(clock.pending()).toBe(0);

    unmount();
    expect(clock.pending()).toBe(0);
  });

  it("uses the canonical sample without scheduling spatial motion when reduced", () => {
    const clock = installFrameClock();
    const onSample = vi.fn<(progress: number) => void>();
    render(
      <CelebrationTimelineProbe
        active
        invalidate={vi.fn()}
        onSample={onSample}
        pageVisible
        reducedMotion
      />,
    );

    expect(lastProgress(onSample)).toBe(1);
    expect(clock.pending()).toBe(0);
  });
});

function CelebrationTimelineProbe({
  active,
  invalidate,
  onComplete,
  onSample,
  pageVisible,
  reducedMotion = false,
}: {
  readonly active: boolean;
  readonly invalidate: () => void;
  readonly onComplete?: () => void;
  readonly onSample: (progress: number) => void;
  readonly pageVisible: boolean;
  readonly reducedMotion?: boolean;
}) {
  useCelebrationTimeline({
    active,
    invalidate,
    onComplete,
    onSample,
    pageVisible,
    reducedMotion,
  });
  return null;
}

function lastProgress(
  onSample: ReturnType<typeof vi.fn<(progress: number) => void>>,
): number {
  const progress = onSample.mock.calls.at(-1)?.[0];
  if (progress === undefined) {
    throw new Error("Expected the celebration timeline to emit a sample");
  }
  return progress;
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
    pending: () => callbacks.size,
    setNow(time: number) {
      currentTime = time;
    },
  };
}
