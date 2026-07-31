import { cleanup, render } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MagicCube } from "@/components/cube/MagicCube";

const fiberState = vi.hoisted(() => ({ invalidate: vi.fn() }));

vi.mock("@react-three/fiber", () => ({
  useThree: (select: (state: { invalidate: () => void }) => unknown) =>
    select({ invalidate: fiberState.invalidate }),
}));

vi.mock("@/components/cube/Cubie", () => ({ Cubie: () => null }));
vi.mock("@/components/cube/useMoveQueue", () => ({
  useMoveQueue: () => ({ isAnimatingRef: { current: false } }),
}));
vi.mock("@/components/cube/useLayerGesture", () => ({
  useLayerGesture: () => ({ handlersFor: () => ({}) }),
}));
vi.mock("@/components/cube/useCubeDropTimeline", () => ({
  useCubeDropTimeline: () => undefined,
}));
vi.mock("@/components/cube/useCelebrationTimeline", () => ({
  useCelebrationTimeline: () => undefined,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("MagicCube scene readiness", () => {
  it("reports readiness once after its root is mounted, including StrictMode", () => {
    const onSceneReady = vi.fn();

    const view = render(
      <StrictMode>
        <MagicCube
          cube={[]}
          introPhase="opening"
          isCelebrating={false}
          onGestureActiveChange={vi.fn()}
          onMoveComplete={vi.fn()}
          onMoveRequest={vi.fn()}
          onOrbitLockChange={vi.fn()}
          onSceneReady={onSceneReady}
          pageVisible
          presentationPosition={[0, 0, 0]}
          presentationScale={1}
          queue={[]}
          reducedMotion={false}
        />
      </StrictMode>,
    );

    expect(view.container.querySelector("group[name='magic-cube-root']")).not.toBeNull();
    expect(onSceneReady).toHaveBeenCalledOnce();

    view.rerender(
      <StrictMode>
        <MagicCube
          cube={[]}
          introPhase="opening"
          isCelebrating={false}
          onGestureActiveChange={vi.fn()}
          onMoveComplete={vi.fn()}
          onMoveRequest={vi.fn()}
          onOrbitLockChange={vi.fn()}
          onSceneReady={onSceneReady}
          pageVisible
          presentationPosition={[0, 0, 0]}
          presentationScale={1}
          queue={[]}
          reducedMotion={false}
        />
      </StrictMode>,
    );

    expect(onSceneReady).toHaveBeenCalledOnce();
  });
});
