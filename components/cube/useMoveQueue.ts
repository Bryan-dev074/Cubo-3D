import { useLayoutEffect, useRef, type MutableRefObject } from "react";
import { useFrame, type RootState } from "@react-three/fiber";
import {
  Group,
  Matrix4,
  MathUtils,
  Quaternion,
  Vector3,
} from "three";

import { CUBIE_SPACING } from "@/components/cube/cube-materials";
import type { CubeMove, CubieState, Mat3i } from "@/lib/cube/types";
import type { QueuedMove } from "@/lib/game/reducer";

export type CubiePivotMap = Map<string, Group>;

export interface LayerVisualPreview {
  readonly move: CubeMove | null;
  readonly angle: number;
  readonly angularVelocity: number;
  readonly selectedIds: ReadonlySet<string>;
}

export interface MoveAnimationState {
  readonly angle: number;
  readonly angularVelocity: number;
}

export interface MoveAnimationStep extends MoveAnimationState {
  readonly done: boolean;
}

interface UseMoveQueueOptions {
  readonly cube: readonly CubieState[];
  readonly invalidate: RootState["invalidate"];
  readonly onMoveComplete: () => void;
  readonly pivotRefs: MutableRefObject<CubiePivotMap>;
  readonly previewRef: MutableRefObject<LayerVisualPreview>;
  readonly queue: readonly QueuedMove[];
  readonly reducedMotion: boolean;
}

// Bound both elapsed time and visible travel: a resumed tab or low-refresh
// device may take slightly longer, but never renders most of a turn at once.
const MAX_MOVE_FRAME_DELTA = 1 / 10;
const MAX_MOVE_ANGULAR_STEP = Math.PI / 4;

export function selectLayerCubieIds(
  cube: readonly CubieState[],
  move: CubeMove,
): readonly string[] {
  const axisIndex = move.axis === "x" ? 0 : move.axis === "y" ? 1 : 2;
  return cube
    .filter((cubie) => cubie.position[axisIndex] === move.layer)
    .map((cubie) => cubie.id);
}

export function moveTargetAngle(move: CubeMove): number {
  return move.turns * (Math.PI / 2);
}

export function createMoveAnimationStart(
  move: CubeMove,
  preview: LayerVisualPreview,
): MoveAnimationState {
  if (
    preview.move?.axis === move.axis &&
    preview.move.layer === move.layer &&
    preview.move.turns === move.turns
  ) {
    return {
      angle: preview.angle,
      angularVelocity: preview.angularVelocity,
    };
  }

  return { angle: 0, angularVelocity: 0 };
}

export function advanceMoveAnimation(
  state: MoveAnimationState,
  target: number,
  delta: number,
  reducedMotion: boolean,
): MoveAnimationStep {
  if (reducedMotion || state.angle === target) {
    return { angle: target, angularVelocity: 0, done: true };
  }

  const safeDelta = Math.min(MAX_MOVE_FRAME_DELTA, Math.max(0, delta));
  const direction = Math.sign(target - state.angle);
  const alignedVelocity =
    Math.sign(state.angularVelocity) === direction ? state.angularVelocity : 0;
  const angularVelocity = alignedVelocity * Math.exp(-18 * safeDelta);
  const easedAngle = MathUtils.damp(state.angle, target, 30, safeDelta);
  const carriedAngle = easedAngle + angularVelocity * safeDelta * 0.32;
  const uncappedAngle = MathUtils.clamp(
    carriedAngle,
    Math.min(state.angle, target),
    Math.max(state.angle, target),
  );
  const angularStep = MathUtils.clamp(
    uncappedAngle - state.angle,
    -MAX_MOVE_ANGULAR_STEP,
    MAX_MOVE_ANGULAR_STEP,
  );
  const angle = state.angle + angularStep;

  if (Math.abs(target - angle) < 0.0015) {
    return { angle: target, angularVelocity: 0, done: true };
  }

  return { angle, angularVelocity, done: false };
}

export function useMoveQueue({
  cube,
  invalidate,
  onMoveComplete,
  pivotRefs,
  previewRef,
  queue,
  reducedMotion,
}: UseMoveQueueOptions): Readonly<{ isAnimatingRef: MutableRefObject<boolean> }> {
  const activeEntryRef = useRef<QueuedMove | null>(null);
  const angleRef = useRef(0);
  const velocityRef = useRef(0);
  const completedRef = useRef(false);
  const isAnimatingRef = useRef(false);
  const scratchRef = useRef(createTransformScratch());

  useLayoutEffect(() => {
    if (!queue[0]) {
      activeEntryRef.current = null;
      angleRef.current = 0;
      velocityRef.current = 0;
      completedRef.current = false;
      isAnimatingRef.current = false;
      applyVisualTransforms(
        cube,
        pivotRefs.current,
        previewRef.current,
        scratchRef.current,
      );
      invalidate();
    }
  }, [cube, invalidate, pivotRefs, previewRef, queue]);

  useFrame((_, delta) => {
    const activeEntry = queue[0];

    if (!activeEntry) {
      isAnimatingRef.current = false;
      applyVisualTransforms(
        cube,
        pivotRefs.current,
        previewRef.current,
        scratchRef.current,
      );
      return;
    }

    if (activeEntryRef.current !== activeEntry) {
      activeEntryRef.current = activeEntry;
      const start = createMoveAnimationStart(
        activeEntry.move,
        previewRef.current,
      );
      angleRef.current = start.angle;
      velocityRef.current = start.angularVelocity;
      previewRef.current = EMPTY_PREVIEW;
      completedRef.current = false;
    }

    isAnimatingRef.current = true;
    const target = moveTargetAngle(activeEntry.move);
    const animation = advanceMoveAnimation(
      {
        angle: angleRef.current,
        angularVelocity: velocityRef.current,
      },
      target,
      delta,
      reducedMotion,
    );
    angleRef.current = animation.angle;
    velocityRef.current = animation.angularVelocity;

    applyVisualTransforms(
      cube,
      pivotRefs.current,
      {
        move: activeEntry.move,
        angle: angleRef.current,
        angularVelocity: velocityRef.current,
        selectedIds: EMPTY_SELECTION,
      },
      scratchRef.current,
    );

    if (animation.done) {
      if (!completedRef.current) {
        completedRef.current = true;
        onMoveComplete();
      }
      return;
    }

    invalidate();
  });

  return { isAnimatingRef };
}

const EMPTY_SELECTION: ReadonlySet<string> = new Set<string>();
const EMPTY_PREVIEW: LayerVisualPreview = {
  move: null,
  angle: 0,
  angularVelocity: 0,
  selectedIds: EMPTY_SELECTION,
};

interface TransformScratch {
  readonly axis: Vector3;
  readonly matrix: Matrix4;
  readonly position: Vector3;
  readonly rotation: Quaternion;
  readonly baseRotation: Quaternion;
}

function createTransformScratch(): TransformScratch {
  return {
    axis: new Vector3(),
    matrix: new Matrix4(),
    position: new Vector3(),
    rotation: new Quaternion(),
    baseRotation: new Quaternion(),
  };
}

function applyVisualTransforms(
  cube: readonly CubieState[],
  pivots: CubiePivotMap,
  preview: LayerVisualPreview,
  scratch: TransformScratch,
): void {
  const selectedByMove = preview.move
    ? new Set(selectLayerCubieIds(cube, preview.move))
    : EMPTY_SELECTION;
  const selectedForCue = preview.selectedIds;
  const rotation = preview.move
    ? scratch.rotation.setFromAxisAngle(
        axisVector(preview.move.axis, scratch.axis),
        preview.angle,
      )
    : scratch.rotation.identity();

  for (const cubie of cube) {
    const pivot = pivots.get(cubie.id);
    if (!pivot) {
      continue;
    }

    scratch.position.set(
      cubie.position[0] * CUBIE_SPACING,
      cubie.position[1] * CUBIE_SPACING,
      cubie.position[2] * CUBIE_SPACING,
    );
    quaternionFromOrientation(cubie.orientation, scratch.matrix, scratch.baseRotation);

    if (preview.move && selectedByMove.has(cubie.id)) {
      scratch.position.applyQuaternion(rotation);
      pivot.quaternion.copy(rotation).multiply(scratch.baseRotation);
    } else {
      pivot.quaternion.copy(scratch.baseRotation);
    }

    pivot.position.copy(scratch.position);
    pivot.scale.setScalar(selectedForCue.has(cubie.id) ? 0.965 : 1);
    pivot.updateMatrix();
  }
}

function quaternionFromOrientation(
  orientation: Mat3i,
  matrix: Matrix4,
  target: Quaternion,
): Quaternion {
  matrix.set(
    orientation[0],
    orientation[1],
    orientation[2],
    0,
    orientation[3],
    orientation[4],
    orientation[5],
    0,
    orientation[6],
    orientation[7],
    orientation[8],
    0,
    0,
    0,
    0,
    1,
  );
  return target.setFromRotationMatrix(matrix);
}

function axisVector(axis: CubeMove["axis"], target: Vector3): Vector3 {
  if (axis === "x") {
    return target.set(1, 0, 0);
  }
  if (axis === "y") {
    return target.set(0, 1, 0);
  }
  return target.set(0, 0, 1);
}
