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
  readonly selectedIds: ReadonlySet<string>;
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
  const completedRef = useRef(false);
  const isAnimatingRef = useRef(false);
  const scratchRef = useRef(createTransformScratch());

  useLayoutEffect(() => {
    if (!queue[0]) {
      activeEntryRef.current = null;
      angleRef.current = 0;
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
      angleRef.current = 0;
      completedRef.current = false;
    }

    isAnimatingRef.current = true;
    const target = moveTargetAngle(activeEntry.move);
    angleRef.current = reducedMotion
      ? target
      : MathUtils.damp(angleRef.current, target, activeEntry.move.turns === 2 ? 9 : 12, delta);

    if (Math.abs(target - angleRef.current) < 0.0015) {
      angleRef.current = target;
    }

    applyVisualTransforms(
      cube,
      pivotRefs.current,
      {
        move: activeEntry.move,
        angle: angleRef.current,
        selectedIds: EMPTY_SELECTION,
      },
      scratchRef.current,
    );

    if (angleRef.current === target) {
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
