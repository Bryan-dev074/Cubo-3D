"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";

import { Cubie } from "@/components/cube/Cubie";
import {
  CUBIE_SPACING,
  createCubeRenderResources,
  disposeCubeRenderResources,
} from "@/components/cube/cube-materials";
import { useLayerGesture } from "@/components/cube/useLayerGesture";
import {
  useMoveQueue,
  type CubiePivotMap,
  type LayerVisualPreview,
} from "@/components/cube/useMoveQueue";
import type { CubeMove, CubieState } from "@/lib/cube/types";
import { CELEBRATION_DURATION_MS } from "@/lib/game/celebration";
import type { QueuedMove } from "@/lib/game/reducer";

interface MagicCubeProps {
  readonly cube: readonly CubieState[];
  readonly isCelebrating: boolean;
  readonly isKeyboardInteracting: boolean;
  readonly isOrbiting: boolean;
  readonly onGestureActiveChange: (active: boolean) => void;
  readonly onMoveComplete: () => void;
  readonly onMoveRequest: (move: CubeMove) => void;
  readonly onOrbitLockChange: (locked: boolean) => void;
  readonly pageVisible: boolean;
  readonly queue: readonly QueuedMove[];
  readonly reducedMotion: boolean;
}

const EMPTY_SELECTION: ReadonlySet<string> = new Set<string>();
export function MagicCube({
  cube,
  isCelebrating,
  isKeyboardInteracting,
  isOrbiting,
  onGestureActiveChange,
  onMoveComplete,
  onMoveRequest,
  onOrbitLockChange,
  pageVisible,
  queue,
  reducedMotion,
}: MagicCubeProps) {
  const invalidate = useThree((state) => state.invalidate);
  const rootRef = useRef<Group>(null);
  const pivotRefs = useRef<CubiePivotMap>(new Map());
  const previewRef = useRef<LayerVisualPreview>({
    move: null,
    angle: 0,
    angularVelocity: 0,
    selectedIds: EMPTY_SELECTION,
  });
  const celebrationStartRef = useRef<number | null>(null);
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

  const { handlersFor, isGestureActive } = useLayerGesture({
    cube,
    disabled: queue.length > 0 || isCelebrating,
    invalidate,
    onActiveChange: onGestureActiveChange,
    onMoveRequest,
    onOrbitLockChange,
    pivotRefs,
    previewRef,
    rootRef: rootRef as MutableRefObject<Group | null>,
  });

  const ambientTurnEnabled =
    pageVisible &&
    !reducedMotion &&
    !isCelebrating &&
    !isKeyboardInteracting &&
    !isOrbiting &&
    !isGestureActive &&
    queue.length === 0;

  useEffect(() => {
    if (!ambientTurnEnabled) {
      return;
    }

    // A coarse invalidation cadence preserves the slow display turn without
    // turning the demand-driven canvas into an unrestricted render loop.
    const timer = window.setInterval(() => invalidate(), 180);
    return () => window.clearInterval(timer);
  }, [ambientTurnEnabled, invalidate]);

  useEffect(() => {
    const restoreCanonicalPositions = () => {
      applyCelebrationSeparation(cube, pivotRefs.current, 1);
    };

    if (!isCelebrating || reducedMotion || !pageVisible) {
      celebrationStartRef.current = null;
      restoreCanonicalPositions();
      invalidate();
      return;
    }

    celebrationStartRef.current = performance.now();
    let frame = 0;
    const animate = (time: number) => {
      invalidate();
      if (
        celebrationStartRef.current !== null &&
        time - celebrationStartRef.current < CELEBRATION_DURATION_MS
      ) {
        frame = window.requestAnimationFrame(animate);
      }
    };
    frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      celebrationStartRef.current = null;
      restoreCanonicalPositions();
      invalidate();
    };
  }, [cube, invalidate, isCelebrating, pageVisible, reducedMotion]);

  useFrame((_, delta) => {
    if (ambientTurnEnabled && rootRef.current) {
      rootRef.current.rotation.y += Math.min(delta, 0.2) * 0.055;
    }

    const celebrationStart = celebrationStartRef.current;
    if (celebrationStart === null) {
      return;
    }

    const progress = Math.min(
      1,
      (performance.now() - celebrationStart) / CELEBRATION_DURATION_MS,
    );
    const separation = celebrationSeparationScale(progress, reducedMotion);
    applyCelebrationSeparation(cube, pivotRefs.current, separation);
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
