import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import {
  useThree,
  type RootState,
  type ThreeEvent,
} from "@react-three/fiber";
import { MathUtils, Vector2, Vector3, type Group } from "three";

import type { CubiePointerHandlers } from "@/components/cube/Cubie";
import type {
  CubiePivotMap,
  LayerVisualPreview,
} from "@/components/cube/useMoveQueue";
import { selectLayerCubieIds } from "@/components/cube/useMoveQueue";
import { resolveLayerGesture } from "@/lib/cube/gesture";
import type {
  Axis,
  CubeMove,
  CubieState,
} from "@/lib/cube/types";

const COMMIT_DISTANCE_PX = 34;
const COMMIT_VELOCITY_PX_PER_SECOND = 460;
const MAX_PREVIEW_ANGLE = Math.PI * 0.14;
const EMPTY_SELECTION: ReadonlySet<string> = new Set<string>();

export function shouldCommitLayerGesture(distance: number, velocity: number): boolean {
  return distance >= COMMIT_DISTANCE_PX || velocity >= COMMIT_VELOCITY_PX_PER_SECOND;
}

interface UseLayerGestureOptions {
  readonly cube: readonly CubieState[];
  readonly disabled: boolean;
  readonly invalidate: RootState["invalidate"];
  readonly onActiveChange: (active: boolean) => void;
  readonly onMoveRequest: (move: CubeMove) => void;
  readonly onOrbitLockChange: (locked: boolean) => void;
  readonly pivotRefs: MutableRefObject<CubiePivotMap>;
  readonly previewRef: MutableRefObject<LayerVisualPreview>;
  readonly rootRef: MutableRefObject<Group | null>;
}

interface ActiveGesture {
  readonly candidates: readonly ProjectedCandidate[];
  readonly cubie: CubieState;
  readonly pointerId: number;
  readonly pointerTarget: PointerCaptureTarget;
  readonly start: Vector2;
  last: Vector2;
  lastAngle: number;
  lastTime: number;
  angularVelocity: number;
  maxVelocity: number;
  move: CubeMove | null;
}

interface ProjectedCandidate {
  readonly axis: Axis;
  readonly layer: -1 | 0 | 1;
  readonly tangent: readonly [number, number];
}

export function useLayerGesture({
  cube,
  disabled,
  invalidate,
  onActiveChange,
  onMoveRequest,
  onOrbitLockChange,
  pivotRefs,
  previewRef,
  rootRef,
}: UseLayerGestureOptions): Readonly<{
  handlersFor: (cubie: CubieState) => CubiePointerHandlers;
  isGestureActive: boolean;
}> {
  const { camera, size } = useThree();
  const gestureRef = useRef<ActiveGesture | null>(null);
  const [isGestureActive, setGestureActive] = useState(false);

  const setActive = useCallback(
    (active: boolean) => {
      setGestureActive(active);
      onActiveChange(active);
    },
    [onActiveChange],
  );

  const clearGesture = useCallback(
    (preservePreview = false) => {
      const gesture = gestureRef.current;
      if (gesture) {
        releasePointer(gesture.pointerTarget, gesture.pointerId);
      }

      gestureRef.current = null;
      if (!preservePreview) {
        previewRef.current = emptyPreview();
      }
      onOrbitLockChange(false);
      setActive(false);
      invalidate();
    },
    [invalidate, onOrbitLockChange, previewRef, setActive],
  );

  useEffect(() => {
    if (disabled && gestureRef.current) {
      clearGesture();
    }
  }, [clearGesture, disabled]);

  useEffect(
    () => () => {
      const gesture = gestureRef.current;
      if (gesture) {
        releasePointer(gesture.pointerTarget, gesture.pointerId);
        gestureRef.current = null;
        previewRef.current = emptyPreview();
        onOrbitLockChange(false);
        onActiveChange(false);
      }
    },
    [onActiveChange, onOrbitLockChange, previewRef],
  );

  const handlersFor = useCallback(
    (cubie: CubieState): CubiePointerHandlers => ({
      onPointerDown(event) {
        if (disabled || gestureRef.current) {
          return;
        }

        event.stopPropagation();
        const point = new Vector2(event.clientX, event.clientY);
        const candidates = projectGestureCandidates({
          cubie,
          event,
          root: rootRef.current,
          camera,
          viewportSize: size,
        });

        if (candidates.length === 0) {
          return;
        }

        onOrbitLockChange(true);
        const pointerTarget = capturePointer(event);
        gestureRef.current = {
          candidates,
          cubie,
          pointerId: event.pointerId,
          pointerTarget,
          start: point.clone(),
          last: point,
          lastAngle: 0,
          lastTime: event.timeStamp,
          angularVelocity: 0,
          maxVelocity: 0,
          move: null,
        };
        previewRef.current = {
          move: null,
          angle: 0,
          angularVelocity: 0,
          selectedIds: new Set([cubie.id]),
        };
        setActive(true);
        invalidate();
      },

      onPointerMove(event) {
        const gesture = gestureRef.current;
        if (!gesture || gesture.pointerId !== event.pointerId) {
          return;
        }

        event.stopPropagation();
        const point = new Vector2(event.clientX, event.clientY);
        const drag = point.clone().sub(gesture.start);
        const elapsed = Math.max(1, event.timeStamp - gesture.lastTime);
        const velocity = (point.distanceTo(gesture.last) / elapsed) * 1_000;
        gesture.maxVelocity = Math.max(gesture.maxVelocity, velocity);
        gesture.last.copy(point);
        gesture.lastTime = event.timeStamp;

        const move = resolveLayerGesture({
          drag: [drag.x, drag.y],
          candidates: gesture.candidates,
        });
        gesture.move = move;

        if (move) {
          const angle =
            Math.sign(move.turns) *
            MathUtils.clamp(drag.length() / 145, 0, MAX_PREVIEW_ANGLE);
          const instantaneousAngularVelocity =
            ((angle - gesture.lastAngle) / elapsed) * 1_000;
          gesture.angularVelocity = MathUtils.clamp(
            MathUtils.lerp(
              gesture.angularVelocity,
              instantaneousAngularVelocity,
              0.72,
            ),
            -12,
            12,
          );
          gesture.lastAngle = angle;
          previewRef.current = {
            move,
            angle,
            angularVelocity: gesture.angularVelocity,
            selectedIds: new Set(selectLayerCubieIds(cube, move)),
          };
        } else {
          gesture.lastAngle = 0;
          gesture.angularVelocity = 0;
          previewRef.current = {
            move: null,
            angle: 0,
            angularVelocity: 0,
            selectedIds: new Set([gesture.cubie.id]),
          };
        }

        invalidate();
      },

      onPointerUp(event) {
        const gesture = gestureRef.current;
        if (!gesture || gesture.pointerId !== event.pointerId) {
          return;
        }

        event.stopPropagation();
        const distance = new Vector2(event.clientX, event.clientY).distanceTo(gesture.start);
        const move = gesture.move;
        const shouldCommit =
          move !== null && shouldCommitLayerGesture(distance, gesture.maxVelocity);

        if (shouldCommit) {
          previewRef.current = {
            ...previewRef.current,
            angularVelocity: gesture.angularVelocity,
            selectedIds: EMPTY_SELECTION,
          };
          clearGesture(true);
          onMoveRequest(move);
        } else {
          clearGesture();
        }
      },

      onPointerCancel(event) {
        const gesture = gestureRef.current;
        if (!gesture || gesture.pointerId !== event.pointerId) {
          return;
        }

        event.stopPropagation();
        clearGesture();
      },

      onLostPointerCapture(event) {
        const gesture = gestureRef.current;
        if (!gesture || gesture.pointerId !== event.pointerId) {
          return;
        }

        event.stopPropagation();
        clearGesture();
      },
    }),
    [
      camera,
      clearGesture,
      cube,
      disabled,
      invalidate,
      onMoveRequest,
      onOrbitLockChange,
      previewRef,
      rootRef,
      setActive,
      size,
    ],
  );

  // Keep the map in this hook's contract: a gesture's selected IDs always
  // address currently mounted, independently transformable pivots.
  void pivotRefs;

  return { handlersFor, isGestureActive };
}

interface ProjectionOptions {
  readonly camera: RootState["camera"];
  readonly cubie: CubieState;
  readonly event: ThreeEvent<PointerEvent>;
  readonly root: Group | null;
  readonly viewportSize: RootState["size"];
}

function projectGestureCandidates({
  camera,
  cubie,
  event,
  root,
  viewportSize,
}: ProjectionOptions): readonly ProjectedCandidate[] {
  if (!root) {
    return [];
  }

  root.updateWorldMatrix(true, false);
  event.object.updateWorldMatrix(true, false);

  const worldNormal = event.face?.normal
    .clone()
    .transformDirection(event.object.matrixWorld)
    .normalize();
  const origin = root.getWorldPosition(new Vector3());
  const relativePoint = event.point.clone().sub(origin);
  const projectedPoint = event.point.clone().project(camera);
  const axes: readonly Axis[] = ["x", "y", "z"];

  return axes.flatMap((axis) => {
    const worldAxis = localAxisToWorld(root, axis);
    if (worldNormal && Math.abs(worldNormal.dot(worldAxis)) > 0.72) {
      return [];
    }

    const tangentWorld = worldAxis.clone().cross(relativePoint);
    if (tangentWorld.lengthSq() < 0.0001) {
      return [];
    }

    tangentWorld.normalize().multiplyScalar(0.7);
    const projectedTangent = event.point.clone().add(tangentWorld).project(camera);
    const tangent: readonly [number, number] = [
      ((projectedTangent.x - projectedPoint.x) * viewportSize.width) / 2,
      (-(projectedTangent.y - projectedPoint.y) * viewportSize.height) / 2,
    ];
    const axisIndex = axis === "x" ? 0 : axis === "y" ? 1 : 2;

    return [
      {
        axis,
        layer: cubie.position[axisIndex],
        tangent,
      },
    ];
  });
}

function localAxisToWorld(root: Group, axis: Axis): Vector3 {
  const local =
    axis === "x"
      ? new Vector3(1, 0, 0)
      : axis === "y"
        ? new Vector3(0, 1, 0)
        : new Vector3(0, 0, 1);
  return local.transformDirection(root.matrixWorld).normalize();
}

interface PointerCaptureTarget extends EventTarget {
  hasPointerCapture?: (capturedPointerId: number) => boolean;
  releasePointerCapture?: (capturedPointerId: number) => void;
  setPointerCapture?: (pointerId: number) => void;
}

function capturePointer(event: ThreeEvent<PointerEvent>): PointerCaptureTarget {
  const target = event.target as PointerCaptureTarget;
  target.setPointerCapture?.(event.pointerId);
  return target;
}

function releasePointer(target: PointerCaptureTarget, pointerId: number): void {
  if (target.hasPointerCapture?.(pointerId) ?? true) {
    target.releasePointerCapture?.(pointerId);
  }
}

function emptyPreview(): LayerVisualPreview {
  return {
    move: null,
    angle: 0,
    angularVelocity: 0,
    selectedIds: EMPTY_SELECTION,
  };
}
