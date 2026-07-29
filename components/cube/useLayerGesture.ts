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
const VELOCITY_SAMPLE_MAX_AGE_MS = 120;
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
  readonly captureTarget: PointerCaptureTarget;
  readonly cubie: CubieState;
  readonly nativeTarget: EventTarget;
  readonly pointerId: number;
  readonly nativeCancelHandler: EventListener;
  readonly start: Vector2;
  last: Vector2;
  lastAngle: number;
  lastTime: number;
  move: CubeMove | null;
  velocitySampleAngle: number;
  velocitySampleMove: CubeMove | null;
  velocitySamplePoint: Vector2;
  velocitySampleTime: number;
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
        gestureRef.current = null;
        removeNativeCancellationListeners(gesture);
        releasePointer(gesture.captureTarget, gesture.pointerId);
      }

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
        gestureRef.current = null;
        removeNativeCancellationListeners(gesture);
        releasePointer(gesture.captureTarget, gesture.pointerId);
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
        const captureTarget = event.target as PointerCaptureTarget;
        const nativeTarget = nativeCancellationTarget(event);
        const nativeCancelHandler: EventListener = (nativeEvent) => {
          if (nativePointerId(nativeEvent) === event.pointerId) {
            clearGesture();
          }
        };
        const gesture: ActiveGesture = {
          candidates,
          captureTarget,
          cubie,
          nativeTarget,
          nativeCancelHandler,
          pointerId: event.pointerId,
          start: point.clone(),
          last: point,
          lastAngle: 0,
          lastTime: event.timeStamp,
          move: null,
          velocitySampleAngle: 0,
          velocitySampleMove: null,
          velocitySamplePoint: point.clone(),
          velocitySampleTime: event.timeStamp,
        };
        gestureRef.current = gesture;
        addNativeCancellationListeners(gesture);
        capturePointer(captureTarget, event.pointerId);
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
        gesture.velocitySamplePoint.copy(gesture.last);
        gesture.velocitySampleTime = gesture.lastTime;
        gesture.velocitySampleAngle = gesture.lastAngle;
        gesture.velocitySampleMove = gesture.move;
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
          const angularVelocity = MathUtils.clamp(
            instantaneousAngularVelocity,
            -12,
            12,
          );
          gesture.lastAngle = angle;
          previewRef.current = {
            move,
            angle,
            angularVelocity,
            selectedIds: new Set(selectLayerCubieIds(cube, move)),
          };
        } else {
          gesture.lastAngle = 0;
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
        const releasePoint = new Vector2(event.clientX, event.clientY);
        const drag = releasePoint.clone().sub(gesture.start);
        const move = resolveLayerGesture({
          drag: [drag.x, drag.y],
          candidates: gesture.candidates,
        });
        const distance = releasePoint.distanceTo(gesture.start);
        const angle = move ? gesturePreviewAngle(drag, move) : 0;
        const releaseVelocity = deriveReleaseVelocity({
          angle,
          gesture,
          move,
          point: releasePoint,
          timeStamp: event.timeStamp,
        });
        const shouldCommit =
          move !== null &&
          shouldCommitLayerGesture(distance, releaseVelocity.linear);

        if (shouldCommit && move) {
          previewRef.current = {
            move,
            angle,
            angularVelocity: releaseVelocity.angular,
            selectedIds: EMPTY_SELECTION,
          };
          clearGesture(true);
          onMoveRequest(move);
        } else {
          clearGesture();
        }
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

function nativeCancellationTarget(
  event: ThreeEvent<PointerEvent>,
): EventTarget {
  const nativeTarget = event.nativeEvent.target;
  if (
    nativeTarget &&
    "addEventListener" in nativeTarget &&
    "removeEventListener" in nativeTarget
  ) {
    return nativeTarget;
  }

  return event.target as unknown as EventTarget;
}

function capturePointer(
  target: PointerCaptureTarget,
  pointerId: number,
): void {
  target.setPointerCapture?.(pointerId);
}

function releasePointer(target: PointerCaptureTarget, pointerId: number): void {
  if (target.hasPointerCapture?.(pointerId) ?? true) {
    target.releasePointerCapture?.(pointerId);
  }
}

function addNativeCancellationListeners(gesture: ActiveGesture): void {
  gesture.nativeTarget.addEventListener(
    "pointercancel",
    gesture.nativeCancelHandler,
  );
  gesture.nativeTarget.addEventListener(
    "lostpointercapture",
    gesture.nativeCancelHandler,
  );
}

function removeNativeCancellationListeners(gesture: ActiveGesture): void {
  gesture.nativeTarget.removeEventListener(
    "pointercancel",
    gesture.nativeCancelHandler,
  );
  gesture.nativeTarget.removeEventListener(
    "lostpointercapture",
    gesture.nativeCancelHandler,
  );
}

function nativePointerId(event: Event): number | null {
  return "pointerId" in event && typeof event.pointerId === "number"
    ? event.pointerId
    : null;
}

interface ReleaseVelocityOptions {
  readonly angle: number;
  readonly gesture: ActiveGesture;
  readonly move: CubeMove | null;
  readonly point: Vector2;
  readonly timeStamp: number;
}

function deriveReleaseVelocity({
  angle,
  gesture,
  move,
  point,
  timeStamp,
}: ReleaseVelocityOptions): Readonly<{
  angular: number;
  linear: number;
}> {
  const releaseAge = Math.max(0, timeStamp - gesture.lastTime);
  if (!move || releaseAge >= VELOCITY_SAMPLE_MAX_AGE_MS) {
    return { angular: 0, linear: 0 };
  }

  const elapsed = Math.max(1, timeStamp - gesture.velocitySampleTime);
  const freshness = MathUtils.clamp(
    1 - releaseAge / VELOCITY_SAMPLE_MAX_AGE_MS,
    0,
    1,
  );
  const linear =
    (point.distanceTo(gesture.velocitySamplePoint) / elapsed) *
    1_000 *
    freshness;
  const compatibleMove =
    gesture.velocitySampleMove === null ||
    sameMove(gesture.velocitySampleMove, move);
  const angular = compatibleMove
    ? MathUtils.clamp(
        ((angle - gesture.velocitySampleAngle) / elapsed) *
          1_000 *
          freshness,
        -12,
        12,
      )
    : 0;

  return { angular, linear };
}

function gesturePreviewAngle(drag: Vector2, move: CubeMove): number {
  return (
    Math.sign(move.turns) *
    MathUtils.clamp(drag.length() / 145, 0, MAX_PREVIEW_ANGLE)
  );
}

function sameMove(left: CubeMove, right: CubeMove): boolean {
  return (
    left.axis === right.axis &&
    left.layer === right.layer &&
    left.turns === right.turns
  );
}

function emptyPreview(): LayerVisualPreview {
  return {
    move: null,
    angle: 0,
    angularVelocity: 0,
    selectedIds: EMPTY_SELECTION,
  };
}
