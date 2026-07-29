import { act, renderHook, waitFor } from "@testing-library/react";
import {
  useThree,
  type RootState,
  type ThreeEvent,
} from "@react-three/fiber";
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Vector3,
} from "three";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CubiePointerHandlers } from "@/components/cube/Cubie";
import { useLayerGesture } from "@/components/cube/useLayerGesture";
import type {
  CubiePivotMap,
} from "@/components/cube/useMoveQueue";
import { createSolvedCube } from "@/lib/cube/state";

vi.mock("@react-three/fiber", async () => {
  const actual = await vi.importActual<typeof import("@react-three/fiber")>(
    "@react-three/fiber",
  );
  return {
    ...actual,
    useThree: vi.fn(),
  };
});

const EMPTY_SELECTION: ReadonlySet<string> = new Set<string>();

describe("useLayerGesture interaction ownership", () => {
  beforeEach(() => {
    const camera = new PerspectiveCamera(34, 800 / 500, 0.1, 40);
    camera.position.set(5, 4, 5);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);

    vi.mocked(useThree).mockReturnValue({
      camera,
      size: { width: 800, height: 500 },
    } as RootState);
  });

  it("locks orbit synchronously before publishing the React gesture state", () => {
    const order: string[] = [];
    const fixture = createFixture({
      onActiveChange: (active) => order.push(`active:${active}`),
      onOrbitLockChange: (locked) => order.push(`orbit:${locked}`),
    });
    const { result } = renderHook(() => useLayerGesture(fixture.options));

    act(() => {
      result.current.handlersFor(fixture.cubie).onPointerDown(fixture.event());
    });

    expect(order.slice(0, 2)).toEqual(["orbit:true", "active:true"]);
    expect(result.current.isGestureActive).toBe(true);
  });

  it("cancels and releases capture when disabled becomes true mid-drag", async () => {
    const fixture = createFixture();
    const { result, rerender } = renderHook(
      ({ disabled }) =>
        useLayerGesture({
          ...fixture.options,
          disabled,
        }),
      { initialProps: { disabled: false } },
    );

    act(() => {
      result.current.handlersFor(fixture.cubie).onPointerDown(fixture.event());
    });
    expect(result.current.isGestureActive).toBe(true);

    rerender({ disabled: true });

    await waitFor(() => expect(result.current.isGestureActive).toBe(false));
    expect(fixture.captureTarget.releasePointerCapture).toHaveBeenCalledWith(7);
    expect(fixture.previewRef.current).toEqual({
      move: null,
      angle: 0,
      angularVelocity: 0,
      selectedIds: EMPTY_SELECTION,
    });
    expect(fixture.onOrbitLockChange).toHaveBeenLastCalledWith(false);
  });

  it("cancels the gesture when pointer capture is lost", () => {
    const fixture = createFixture();
    const { result } = renderHook(() => useLayerGesture(fixture.options));

    act(() => {
      result.current.handlersFor(fixture.cubie).onPointerDown(fixture.event());
    });

    const handlers = result.current.handlersFor(fixture.cubie) as CubiePointerHandlers & {
      onLostPointerCapture?: (event: ThreeEvent<PointerEvent>) => void;
    };
    expect(handlers.onLostPointerCapture).toBeTypeOf("function");

    act(() => {
      handlers.onLostPointerCapture?.(fixture.event());
    });

    expect(result.current.isGestureActive).toBe(false);
    expect(fixture.onOrbitLockChange).toHaveBeenLastCalledWith(false);
  });

  it("keeps the released preview angle and angular velocity for an accepted move", () => {
    const fixture = createFixture();
    const { result } = renderHook(() => useLayerGesture(fixture.options));
    const handlers = result.current.handlersFor(fixture.cubie);

    act(() => {
      handlers.onPointerDown(fixture.event({ timeStamp: 100 }));
      handlers.onPointerMove(
        fixture.event({ clientX: 470, timeStamp: 140 }),
      );
      handlers.onPointerUp(
        fixture.event({ clientX: 470, timeStamp: 160 }),
      );
    });

    expect(fixture.onMoveRequest).toHaveBeenCalledTimes(1);
    expect(fixture.previewRef.current.move).toEqual(
      fixture.onMoveRequest.mock.calls[0][0],
    );
    expect(Math.abs(fixture.previewRef.current.angle)).toBeGreaterThan(0);
    expect(Math.abs(fixture.previewRef.current.angularVelocity)).toBeGreaterThan(0);
  });
});

function createFixture({
  onActiveChange = vi.fn(),
  onOrbitLockChange = vi.fn(),
}: {
  readonly onActiveChange?: (active: boolean) => void;
  readonly onOrbitLockChange?: (locked: boolean) => void;
} = {}) {
  const cube = createSolvedCube();
  const cubie = cube.find(({ id }) => id === "1,1,1") ?? cube[0];
  const root = new Group();
  root.updateMatrixWorld(true);
  const object = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  object.updateMatrixWorld(true);
  const captureTarget = {
    setPointerCapture: vi.fn(),
    hasPointerCapture: vi.fn(() => true),
    releasePointerCapture: vi.fn(),
  };
  const previewRef = {
    current: {
      move: null,
      angle: 0,
      angularVelocity: 0,
      selectedIds: EMPTY_SELECTION,
    },
  };
  const onOrbitLockChangeMock = vi.fn(onOrbitLockChange);
  const onMoveRequest = vi.fn();

  return {
    captureTarget,
    cubie,
    onOrbitLockChange: onOrbitLockChangeMock,
    onMoveRequest,
    previewRef,
    event: (
      overrides: Partial<{
        clientX: number;
        clientY: number;
        timeStamp: number;
      }> = {},
    ) =>
      ({
        clientX: overrides.clientX ?? 420,
        clientY: overrides.clientY ?? 245,
        face: { normal: new Vector3(0, 0, 1) },
        object,
        point: new Vector3(1, 1, 1.5),
        pointerId: 7,
        stopPropagation: vi.fn(),
        target: captureTarget,
        timeStamp: overrides.timeStamp ?? 100,
      }) as unknown as ThreeEvent<PointerEvent>,
    options: {
      cube,
      disabled: false,
      invalidate: vi.fn(),
      onActiveChange,
      onMoveRequest,
      onOrbitLockChange: onOrbitLockChangeMock,
      pivotRefs: { current: new Map() as CubiePivotMap },
      previewRef,
      rootRef: { current: root },
    },
  };
}
