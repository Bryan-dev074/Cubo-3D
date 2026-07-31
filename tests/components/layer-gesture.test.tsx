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
  SphereGeometry,
  Vector3,
} from "three";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useLayerGesture } from "@/components/cube/useLayerGesture";
import type {
  CubiePivotMap,
} from "@/components/cube/useMoveQueue";
import { createSolvedCube } from "@/lib/cube/state";
import type { CubeMove } from "@/lib/cube/types";
import {
  DISABLED_CURSOR_INTENT,
  IDLE_CURSOR_INTENT,
  LAYER_READY_CURSOR_INTENT,
  cursorIntentForMove,
} from "@/lib/motion/cursor-intent";

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

  it("ignores the right mouse button before capture or orbit lock", () => {
    const fixture = createFixture();
    const { result } = renderHook(() => useLayerGesture(fixture.options));
    const event = fixture.event({ button: 2 });

    act(() => {
      result.current.handlersFor(fixture.cubie).onPointerDown(event);
    });

    expect(event.stopPropagation).not.toHaveBeenCalled();
    expect(fixture.captureTarget.setPointerCapture).not.toHaveBeenCalled();
    expect(fixture.onOrbitLockChange).not.toHaveBeenCalled();
    expect(result.current.isGestureActive).toBe(false);
  });

  it("emits frozen hover intent once and does not flicker within one cubie", () => {
    const fixture = createFixture();
    const { result } = renderHook(() => useLayerGesture(fixture.options));
    const handlers = result.current.handlersFor(fixture.cubie);
    const sameCubiePivot = new Group();
    sameCubiePivot.userData.cubieId = fixture.cubie.id;
    const sameCubieSurface = new Mesh();
    sameCubiePivot.add(sameCubieSurface);
    const foreignSurface = new Mesh();
    foreignSurface.userData.cubieId = "foreign";
    fixture.onCursorIntentChange.mockClear();

    act(() => {
      handlers.onPointerOver(fixture.event());
      handlers.onPointerOver(fixture.event());
    });

    expect(fixture.onCursorIntentChange).toHaveBeenCalledTimes(1);
    expect(fixture.onCursorIntentChange).toHaveBeenLastCalledWith(
      LAYER_READY_CURSOR_INTENT,
    );
    expect(Object.isFrozen(LAYER_READY_CURSOR_INTENT)).toBe(true);

    act(() => {
      handlers.onPointerOut(
        fixture.event({ intersections: [sameCubieSurface] }),
      );
    });
    expect(fixture.onCursorIntentChange).toHaveBeenCalledTimes(1);

    act(() => {
      handlers.onPointerOut(
        fixture.event({ intersections: [foreignSurface] }),
      );
    });
    expect(fixture.onCursorIntentChange).toHaveBeenCalledTimes(2);
    expect(fixture.onCursorIntentChange).toHaveBeenLastCalledWith(
      IDLE_CURSOR_INTENT,
    );
  });

  it("preserves the current hover intent when its listener changes", () => {
    const fixture = createFixture();
    const firstListener = vi.fn();
    const secondListener = vi.fn();
    const { result, rerender } = renderHook(
      ({ listener }) =>
        useLayerGesture({
          ...fixture.options,
          onCursorIntentChange: listener,
        }),
      { initialProps: { listener: firstListener } },
    );

    act(() => {
      result.current.handlersFor(fixture.cubie).onPointerOver(fixture.event());
    });
    expect(firstListener).toHaveBeenLastCalledWith(LAYER_READY_CURSOR_INTENT);

    rerender({ listener: secondListener });

    expect(secondListener).toHaveBeenCalledTimes(1);
    expect(secondListener).toHaveBeenLastCalledWith(LAYER_READY_CURSOR_INTENT);
  });

  it("derives drag intent from the initial owner and ignores foreign hover", () => {
    const fixture = createFixture();
    const other = fixture.cube.find(({ id }) => id !== fixture.cubie.id)!;
    const { result } = renderHook(() => useLayerGesture(fixture.options));
    const initialHandlers = result.current.handlersFor(fixture.cubie);
    const otherHandlers = result.current.handlersFor(other);
    fixture.onCursorIntentChange.mockClear();

    act(() => {
      initialHandlers.onPointerOver(fixture.event());
      initialHandlers.onPointerDown(fixture.event({ timeStamp: 100 }));
      otherHandlers.onPointerOver(fixture.event({ clientX: 450 }));
      otherHandlers.onPointerOut(fixture.event({ intersections: [] }));
      otherHandlers.onPointerMove(
        fixture.event({ clientX: 490, timeStamp: 140 }),
      );
    });

    const resolvedMove = fixture.previewRef.current.move as CubeMove | null;
    expect(resolvedMove).not.toBeNull();
    expect(fixture.onCursorIntentChange).toHaveBeenNthCalledWith(
      1,
      LAYER_READY_CURSOR_INTENT,
    );
    expect(fixture.onCursorIntentChange).toHaveBeenNthCalledWith(
      2,
      cursorIntentForMove(resolvedMove!),
    );
    expect(fixture.onCursorIntentChange).toHaveBeenCalledTimes(2);
    const axisIndex =
      resolvedMove!.axis === "x" ? 0 : resolvedMove!.axis === "y" ? 1 : 2;
    expect(resolvedMove!.layer).toBe(fixture.cubie.position[axisIndex]);

    act(() => {
      otherHandlers.onPointerUp(
        fixture.event({ clientX: 490, timeStamp: 160 }),
      );
    });
    expect(fixture.onCursorIntentChange).toHaveBeenLastCalledWith(
      IDLE_CURSOR_INTENT,
    );
  });

  it("keeps the locked layer intent when an active drag returns to its origin", () => {
    const fixture = createFixture();
    const { result } = renderHook(() => useLayerGesture(fixture.options));
    const handlers = result.current.handlersFor(fixture.cubie);
    fixture.onCursorIntentChange.mockClear();

    act(() => {
      handlers.onPointerDown(fixture.event({ timeStamp: 100 }));
      handlers.onPointerMove(
        fixture.event({ clientX: 490, timeStamp: 140 }),
      );
    });
    expect(fixture.previewRef.current.move).not.toBeNull();
    const firstResolvedMove = fixture.previewRef.current.move as CubeMove | null;
    expect(
      fixture.onCursorIntentChange.mock.calls.at(-1)?.[0].mode,
    ).toBe("layer-drag");

    act(() => {
      handlers.onPointerMove(
        fixture.event({ clientX: 420, timeStamp: 180 }),
      );
    });

    expect(fixture.previewRef.current.move).toEqual(firstResolvedMove);
    expect(fixture.onCursorIntentChange).toHaveBeenLastCalledWith(
      cursorIntentForMove(firstResolvedMove!),
    );
  });

  it("emits disabled and ignores hover while interaction is unavailable", () => {
    const fixture = createFixture();
    const { result } = renderHook(() =>
      useLayerGesture({ ...fixture.options, disabled: true }),
    );

    expect(fixture.onCursorIntentChange).toHaveBeenCalledTimes(1);
    expect(fixture.onCursorIntentChange).toHaveBeenLastCalledWith(
      DISABLED_CURSOR_INTENT,
    );
    expect(Object.isFrozen(DISABLED_CURSOR_INTENT)).toBe(true);

    act(() => {
      result.current.handlersFor(fixture.cubie).onPointerOver(fixture.event());
    });
    expect(fixture.onCursorIntentChange).toHaveBeenCalledTimes(1);
  });

  it.each(["pointercancel", "lostpointercapture"])(
    "restores idle cursor intent after native %s",
    (eventType) => {
      const fixture = createFixture();
      const { result } = renderHook(() => useLayerGesture(fixture.options));
      const handlers = result.current.handlersFor(fixture.cubie);
      fixture.onCursorIntentChange.mockClear();

      act(() => {
        handlers.onPointerOver(fixture.event());
        handlers.onPointerDown(fixture.event());
        fixture.nativeTarget.dispatchEvent(nativePointerEvent(eventType, 7));
      });

      expect(fixture.onCursorIntentChange).toHaveBeenLastCalledWith(
        IDLE_CURSOR_INTENT,
      );
    },
  );

  it("restores idle cursor intent when an active gesture unmounts", () => {
    const fixture = createFixture();
    const { result, unmount } = renderHook(() =>
      useLayerGesture(fixture.options),
    );
    fixture.onCursorIntentChange.mockClear();

    act(() => {
      result.current.handlersFor(fixture.cubie).onPointerDown(fixture.event());
    });
    unmount();

    expect(fixture.onCursorIntentChange).toHaveBeenLastCalledWith(
      IDLE_CURSOR_INTENT,
    );
  });

  it("keeps the initial cubie owner when move and release arrive over another cubie", () => {
    const fixture = createFixture();
    const other = fixture.cube.find(
      ({ position }) =>
        position[0] !== fixture.cubie.position[0] &&
        position[1] !== fixture.cubie.position[1] &&
        position[2] !== fixture.cubie.position[2],
    )!;
    const foreignObject = new Mesh(
      new SphereGeometry(0.5),
      new MeshBasicMaterial(),
    );
    foreignObject.updateMatrixWorld(true);
    const { result } = renderHook(() => useLayerGesture(fixture.options));
    const initialHandlers = result.current.handlersFor(fixture.cubie);
    const otherHandlers = result.current.handlersFor(other);

    act(() => {
      initialHandlers.onPointerDown(fixture.event({ timeStamp: 100 }));
      otherHandlers.onPointerMove(
        fixture.event({
          clientX: 760,
          clientY: 430,
          face: { normal: new Vector3(-1, 0, 0) },
          object: foreignObject,
          point: new Vector3(-4, -3, 2),
          pointerId: 19,
          timeStamp: 120,
        }),
      );
      otherHandlers.onPointerUp(
        fixture.event({
          clientX: 760,
          clientY: 430,
          face: { normal: new Vector3(-1, 0, 0) },
          object: foreignObject,
          point: new Vector3(-4, -3, 2),
          pointerId: 19,
          timeStamp: 130,
        }),
      );
    });

    expect(result.current.isGestureActive).toBe(true);
    expect(fixture.onMoveRequest).not.toHaveBeenCalled();
    expect(fixture.captureTarget.releasePointerCapture).not.toHaveBeenCalled();

    act(() => {
      otherHandlers.onPointerMove(
        fixture.event({
          clientX: 490,
          face: { normal: new Vector3(-1, 0, 0) },
          object: foreignObject,
          point: new Vector3(-4, -3, 2),
          timeStamp: 140,
        }),
      );
      otherHandlers.onPointerUp(
        fixture.event({
          clientX: 490,
          face: { normal: new Vector3(-1, 0, 0) },
          object: foreignObject,
          point: new Vector3(-4, -3, 2),
          timeStamp: 160,
        }),
      );
    });

    expect(fixture.onMoveRequest).toHaveBeenCalledTimes(1);
    const move = fixture.onMoveRequest.mock.calls[0][0];
    const axisIndex = move.axis === "x" ? 0 : move.axis === "y" ? 1 : 2;
    expect(move.layer).toBe(fixture.cubie.position[axisIndex]);
    expect(move.layer).not.toBe(other.position[axisIndex]);
    expect(fixture.captureTarget.releasePointerCapture).toHaveBeenCalledWith(7);
  });

  it("locks the first resolved layer through an L-shaped drag over a foreign cubie", () => {
    const fixture = createFixture();
    const owner = fixture.cubie;
    const foreignCubie = fixture.cube.find(({ id }) => id !== owner.id)!;
    const { result } = renderHook(() => useLayerGesture(fixture.options));
    const ownerHandlers = result.current.handlersFor(owner);
    const foreignHandlers = result.current.handlersFor(foreignCubie);

    act(() => {
      ownerHandlers.onPointerDown(fixture.event({ timeStamp: 100 }));
      ownerHandlers.onPointerMove(
        fixture.event({ clientX: 474, clientY: 249, timeStamp: 120 }),
      );
    });

    const firstResolvedMove: CubeMove | null = fixture.previewRef.current.move;

    act(() => {
      foreignHandlers.onPointerMove(
        fixture.event({ clientX: 484, clientY: 349, timeStamp: 140 }),
      );
    });

    const lShapePreview = fixture.previewRef.current as {
      readonly move: CubeMove | null;
      readonly selectedIds: ReadonlySet<string>;
    };
    const lastDragIntent = fixture.onCursorIntentChange.mock.calls.at(-1)?.[0];

    expect(firstResolvedMove).not.toBeNull();
    expect(lShapePreview.move).toMatchObject({
      axis: firstResolvedMove!.axis,
      layer: firstResolvedMove!.layer,
    });
    expect(lShapePreview.selectedIds).toEqual(new Set([owner.id]));
    expect(lastDragIntent).toBe(cursorIntentForMove(lShapePreview.move!));

    act(() => {
      foreignHandlers.onPointerUp(
        fixture.event({ clientX: 484, clientY: 349, timeStamp: 160 }),
      );
    });

    expect(fixture.onMoveRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        axis: firstResolvedMove!.axis,
        layer: firstResolvedMove!.layer,
      }),
    );
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
    expect(fixture.onCursorIntentChange).toHaveBeenLastCalledWith(
      DISABLED_CURSOR_INTENT,
    );
    expect(fixture.previewRef.current).toEqual({
      move: null,
      angle: 0,
      angularVelocity: 0,
      selectedIds: EMPTY_SELECTION,
    });
    expect(fixture.onOrbitLockChange).toHaveBeenLastCalledWith(false);
  });

  it.each(["pointercancel", "lostpointercapture"])(
    "cancels the gesture from a native %s event",
    (eventType) => {
      const fixture = createFixture();
      const { result } = renderHook(() => useLayerGesture(fixture.options));

      act(() => {
        result.current.handlersFor(fixture.cubie).onPointerDown(fixture.event());
      });

      act(() => {
        fixture.nativeTarget.dispatchEvent(nativePointerEvent(eventType, 7));
      });

      expect(result.current.isGestureActive).toBe(false);
      expect(fixture.onOrbitLockChange).toHaveBeenLastCalledWith(false);
    },
  );

  it("removes native cancellation listeners before explicit release", () => {
    const fixture = createFixture({ dispatchLostOnRelease: true });
    const { result } = renderHook(() => useLayerGesture(fixture.options));
    const handlers = result.current.handlersFor(fixture.cubie);

    act(() => {
      handlers.onPointerDown(fixture.event({ timeStamp: 100 }));
      handlers.onPointerMove(fixture.event({ clientX: 470, timeStamp: 140 }));
      handlers.onPointerUp(fixture.event({ clientX: 470, timeStamp: 160 }));
    });

    const releaseIndex = fixture.nativeOrder.indexOf("release");
    const cancelRemovalIndex =
      fixture.nativeOrder.indexOf("remove:pointercancel");
    const lostRemovalIndex =
      fixture.nativeOrder.indexOf("remove:lostpointercapture");
    expect(releaseIndex).toBeGreaterThanOrEqual(0);
    expect(cancelRemovalIndex).toBeGreaterThanOrEqual(0);
    expect(lostRemovalIndex).toBeGreaterThanOrEqual(0);
    expect(cancelRemovalIndex).toBeLessThan(releaseIndex);
    expect(lostRemovalIndex).toBeLessThan(releaseIndex);
    expect(fixture.onMoveRequest).toHaveBeenCalledTimes(1);
    expect(fixture.previewRef.current.move).toEqual(
      fixture.onMoveRequest.mock.calls[0][0],
    );
    expect(Math.abs(fixture.previewRef.current.angle)).toBeGreaterThan(0);
  });

  it("removes native cancellation listeners before releasing capture on unmount", () => {
    const fixture = createFixture();
    const { result, unmount } = renderHook(() => useLayerGesture(fixture.options));

    act(() => {
      result.current.handlersFor(fixture.cubie).onPointerDown(fixture.event());
    });
    unmount();

    const releaseIndex = fixture.nativeOrder.indexOf("release");
    const cancelRemovalIndex =
      fixture.nativeOrder.indexOf("remove:pointercancel");
    const lostRemovalIndex =
      fixture.nativeOrder.indexOf("remove:lostpointercapture");
    expect(releaseIndex).toBeGreaterThanOrEqual(0);
    expect(cancelRemovalIndex).toBeGreaterThanOrEqual(0);
    expect(lostRemovalIndex).toBeGreaterThanOrEqual(0);
    expect(cancelRemovalIndex).toBeLessThan(releaseIndex);
    expect(lostRemovalIndex).toBeLessThan(releaseIndex);
  });

  it("commits an immediate sub-threshold flick and transfers its release velocity", () => {
    const fixture = createFixture();
    const { result } = renderHook(() => useLayerGesture(fixture.options));
    const handlers = result.current.handlersFor(fixture.cubie);

    act(() => {
      handlers.onPointerDown(fixture.event({ timeStamp: 100 }));
      handlers.onPointerMove(
        fixture.event({ clientX: 438, timeStamp: 110 }),
      );
      handlers.onPointerUp(
        fixture.event({ clientX: 438, timeStamp: 115 }),
      );
    });

    expect(fixture.onMoveRequest).toHaveBeenCalledTimes(1);
    expect(fixture.previewRef.current.move).toEqual(
      fixture.onMoveRequest.mock.calls[0][0],
    );
    expect(Math.abs(fixture.previewRef.current.angle)).toBeGreaterThan(0);
    expect(Math.abs(fixture.previewRef.current.angularVelocity)).toBeGreaterThan(0);
  });

  it("does not velocity-commit a short move after the release sample becomes stale", () => {
    const fixture = createFixture();
    const { result } = renderHook(() => useLayerGesture(fixture.options));
    const handlers = result.current.handlersFor(fixture.cubie);

    act(() => {
      handlers.onPointerDown(fixture.event({ timeStamp: 100 }));
      handlers.onPointerMove(fixture.event({ clientX: 438, timeStamp: 110 }));
      handlers.onPointerUp(fixture.event({ clientX: 438, timeStamp: 400 }));
    });

    expect(fixture.onMoveRequest).not.toHaveBeenCalled();
    expect(fixture.previewRef.current.angularVelocity).toBe(0);
  });

  it("commits a deliberate move after a pause without transferring stale speed", () => {
    const fixture = createFixture();
    const { result } = renderHook(() => useLayerGesture(fixture.options));
    const handlers = result.current.handlersFor(fixture.cubie);

    act(() => {
      handlers.onPointerDown(fixture.event({ timeStamp: 100 }));
      handlers.onPointerMove(fixture.event({ clientX: 460, timeStamp: 120 }));
      handlers.onPointerUp(fixture.event({ clientX: 460, timeStamp: 420 }));
    });

    expect(fixture.onMoveRequest).toHaveBeenCalledTimes(1);
    expect(fixture.previewRef.current.angularVelocity).toBe(0);
  });
});

function createFixture({
  dispatchLostOnRelease = false,
  onActiveChange = vi.fn(),
  onOrbitLockChange = vi.fn(),
}: {
  readonly dispatchLostOnRelease?: boolean;
  readonly onActiveChange?: (active: boolean) => void;
  readonly onOrbitLockChange?: (locked: boolean) => void;
} = {}) {
  const cube = createSolvedCube();
  const cubie = cube.find(({ id }) => id === "1,1,1") ?? cube[0];
  const root = new Group();
  root.updateMatrixWorld(true);
  const initialObject = new Mesh(
    new BoxGeometry(1, 1, 1),
    new MeshBasicMaterial(),
  );
  initialObject.updateMatrixWorld(true);
  const nativeOrder: string[] = [];
  const nativeTarget = new EventTarget();
  const addEventListener = nativeTarget.addEventListener.bind(nativeTarget);
  const removeEventListener = nativeTarget.removeEventListener.bind(nativeTarget);
  vi.spyOn(nativeTarget, "addEventListener").mockImplementation(
    (type, listener, options) => {
      nativeOrder.push(`add:${type}`);
      addEventListener(type, listener, options);
    },
  );
  vi.spyOn(nativeTarget, "removeEventListener").mockImplementation(
    (type, listener, options) => {
      nativeOrder.push(`remove:${type}`);
      removeEventListener(type, listener, options);
    },
  );
  const captureTarget = {
    setPointerCapture: vi.fn(),
    hasPointerCapture: vi.fn(() => true),
    releasePointerCapture: vi.fn((pointerId: number) => {
      nativeOrder.push("release");
      if (dispatchLostOnRelease) {
        nativeTarget.dispatchEvent(
          nativePointerEvent("lostpointercapture", pointerId),
        );
      }
    }),
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
  const onCursorIntentChange = vi.fn();

  return {
    captureTarget,
    cube,
    cubie,
    nativeTarget,
    nativeOrder,
    onCursorIntentChange,
    onOrbitLockChange: onOrbitLockChangeMock,
    onMoveRequest,
    previewRef,
    event: (
      overrides: Partial<{
        button: number;
        clientX: number;
        clientY: number;
        face: { normal: Vector3 };
        object: Mesh;
        intersections: readonly Mesh[];
        point: Vector3;
        pointerId: number;
        pointerType: string;
        timeStamp: number;
      }> = {},
    ) => {
      const {
        button = 0,
        clientX = 420,
        clientY = 245,
        face = { normal: new Vector3(0, 0, 1) },
        object = initialObject,
        intersections = [],
        point = new Vector3(1, 1, 1.5),
        pointerId = 7,
        pointerType = "mouse",
        timeStamp = 100,
      } = overrides;
      const nativeEvent = nativePointerEvent(
        "pointerdown",
        pointerId,
      ) as PointerEvent;
      Object.defineProperties(nativeEvent, {
        button: { configurable: true, value: button },
        pointerType: { configurable: true, value: pointerType },
        target: { configurable: true, value: nativeTarget },
      });

      return {
        button,
        clientX,
        clientY,
        face,
        intersections: intersections.map((intersectionObject) => ({
          object: intersectionObject,
        })),
        nativeEvent,
        object,
        point,
        pointerId,
        pointerType,
        stopPropagation: vi.fn(),
        target: captureTarget,
        timeStamp,
      } as unknown as ThreeEvent<PointerEvent>;
    },
    options: {
      cube,
      disabled: false,
      invalidate: vi.fn(),
      onActiveChange,
      onCursorIntentChange,
      onMoveRequest,
      onOrbitLockChange: onOrbitLockChangeMock,
      pivotRefs: { current: new Map() as CubiePivotMap },
      previewRef,
      rootRef: { current: root },
    },
  };
}

function nativePointerEvent(type: string, pointerId: number): Event {
  const event = new Event(type);
  Object.defineProperty(event, "pointerId", {
    configurable: true,
    value: pointerId,
  });
  return event;
}
