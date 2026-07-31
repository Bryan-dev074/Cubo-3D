"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";
import { useThree } from "@react-three/fiber";
import type { Group } from "three";

import { Cubie } from "@/components/cube/Cubie";
import {
  CUBIE_SPACING,
  createCubeRenderResources,
  disposeCubeRenderResources,
} from "@/components/cube/cube-materials";
import { useCelebrationTimeline } from "@/components/cube/useCelebrationTimeline";
import { useLayerGesture } from "@/components/cube/useLayerGesture";
import { useCubeDropTimeline } from "@/components/cube/useCubeDropTimeline";
import {
  useMoveQueue,
  type CubiePivotMap,
  type LayerVisualPreview,
} from "@/components/cube/useMoveQueue";
import type { CubeMove, CubieState } from "@/lib/cube/types";
import type { QueuedMove } from "@/lib/game/reducer";
import type {
  CubeDropProfile,
  CubeDropSample,
} from "@/lib/motion/cube-drop";
import type { CursorIntent } from "@/lib/motion/cursor-intent";
import type { IntroPhase } from "@/lib/motion/intro-sequence";

interface MagicCubeProps {
  readonly cube: readonly CubieState[];
  readonly dropProfile: CubeDropProfile;
  readonly introPhase: IntroPhase;
  readonly isCelebrating: boolean;
  readonly onDropComplete?: () => void;
  readonly onCursorIntentChange?: (intent: CursorIntent) => void;
  readonly onGestureActiveChange: (active: boolean) => void;
  readonly onMoveComplete: () => void;
  readonly onMoveRequest: (move: CubeMove) => void;
  readonly onOrbitLockChange: (locked: boolean) => void;
  readonly onSceneReady?: () => void;
  readonly pageVisible: boolean;
  readonly presentationPosition: readonly [number, number, number];
  readonly presentationScale: number;
  readonly queue: readonly QueuedMove[];
  readonly reducedMotion: boolean;
}

const EMPTY_SELECTION: ReadonlySet<string> = new Set<string>();

export function MagicCube({
  cube,
  dropProfile,
  introPhase,
  isCelebrating,
  onDropComplete,
  onCursorIntentChange,
  onGestureActiveChange,
  onMoveComplete,
  onMoveRequest,
  onOrbitLockChange,
  onSceneReady,
  pageVisible,
  presentationPosition,
  presentationScale,
  queue,
  reducedMotion,
}: MagicCubeProps) {
  const invalidate = useThree((state) => state.invalidate);
  const rootRef = useRef<Group>(null);
  const sceneReadyCalledRef = useRef(false);
  const pivotRefs = useRef<CubiePivotMap>(new Map());
  const previewRef = useRef<LayerVisualPreview>({
    move: null,
    angle: 0,
    angularVelocity: 0,
    selectedIds: EMPTY_SELECTION,
  });
  const resources = useMemo(() => createCubeRenderResources(), []);

  useEffect(
    () => () => {
      disposeCubeRenderResources(resources);
      pivotRefs.current.clear();
    },
    [resources],
  );

  useMoveQueue({
    cube,
    invalidate,
    onMoveComplete,
    pivotRefs,
    previewRef,
    queue,
    reducedMotion,
  });

  const { handlersFor } = useLayerGesture({
    cube,
    disabled: introPhase !== "ready" || queue.length > 0 || isCelebrating,
    invalidate,
    onActiveChange: onGestureActiveChange,
    onCursorIntentChange: onCursorIntentChange,
    onMoveRequest,
    onOrbitLockChange,
    pivotRefs,
    previewRef,
    rootRef: rootRef as MutableRefObject<Group | null>,
  });

  const applyDropSample = useCallback(
    (sample: CubeDropSample) => {
      applyRootDrop(rootRef.current, presentationPosition, sample);
    },
    [presentationPosition],
  );
  useCubeDropTimeline({
    dropProfile,
    introPhase,
    invalidate,
    onComplete: onDropComplete,
    onSample: applyDropSample,
    pageVisible,
    reducedMotion,
  });
  useLayoutEffect(() => {
    if (
      !rootRef.current ||
      !onSceneReady ||
      sceneReadyCalledRef.current
    ) {
      return;
    }

    sceneReadyCalledRef.current = true;
    onSceneReady?.();
  }, [onSceneReady]);

  const applyCelebrationSample = useCallback(
    (progress: number) => {
      const separation = celebrationSeparationScale(progress, reducedMotion);
      applyCelebrationSeparation(cube, pivotRefs.current, separation);
    },
    [cube, reducedMotion],
  );
  useCelebrationTimeline({
    active: isCelebrating,
    invalidate,
    onSample: applyCelebrationSample,
    pageVisible,
    reducedMotion,
  });

  const registerPivot = useCallback(
    (cubieId: string) => (node: Group | null) => {
      if (node) {
        pivotRefs.current.set(cubieId, node);
      } else {
        pivotRefs.current.delete(cubieId);
      }
    },
    [],
  );

  const pivotNames = useMemo(
    () => cube.map((cubie) => `cubie-pivot:${cubie.id}`),
    [cube],
  );

  return (
    <group
      ref={rootRef}
      name="magic-cube-root"
      position={presentationPosition}
      scale={presentationScale}
      userData={{
        sculptRuntime: {
          stableIds: cube.map((cubie) => cubie.id),
          nodes: pivotNames,
          stickerCount: 54,
          collider: { type: "compound-box", children: 26 },
          destructionGroups: cube.map((cubie) => `cubie:${cubie.id}`),
          interaction: "layer-gesture",
        },
      }}
    >
      <group name="core-socket" userData={{ socket: "cube-core", hidden: true }} />
      {cube.map((cubie) => (
        <Cubie
          key={cubie.id}
          cubie={cubie}
          handlers={handlersFor(cubie)}
          pivotRef={registerPivot(cubie.id)}
          resources={resources}
        />
      ))}
    </group>
  );
}

export function applyRootDrop(
  root: Group | null,
  canonicalPosition: readonly [number, number, number],
  sample: CubeDropSample,
): void {
  if (!root) {
    return;
  }

  root.position.set(
    canonicalPosition[0],
    canonicalPosition[1] + sample.offsetY,
    canonicalPosition[2],
  );
  root.rotation.set(sample.rotationX, 0, sample.rotationZ);
  root.updateMatrix();
}

export function celebrationSeparationScale(
  progress: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion) {
    return 1;
  }

  const normalized = Math.min(1, Math.max(0, progress));
  return 1 + Math.sin(normalized * Math.PI) * 0.06;
}

export function applyCelebrationSeparation(
  cube: readonly CubieState[],
  pivots: CubiePivotMap,
  separation: number,
): void {
  for (const cubie of cube) {
    const pivot = pivots.get(cubie.id);
    if (!pivot) {
      continue;
    }

    pivot.position.set(
      cubie.position[0] * CUBIE_SPACING * separation,
      cubie.position[1] * CUBIE_SPACING * separation,
      cubie.position[2] * CUBIE_SPACING * separation,
    );
    pivot.updateMatrix();
  }
}
