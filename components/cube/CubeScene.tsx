"use client";

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Canvas, useThree, type RootState } from "@react-three/fiber";
import {
  AdaptiveDpr,
  OrbitControls,
} from "@react-three/drei";
import {
  ACESFilmicToneMapping,
  MOUSE,
  type RectAreaLight,
  SRGBColorSpace,
} from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { MagicCube } from "@/components/cube/MagicCube";
import { usePageVisibility } from "@/components/experience/usePageVisibility";
import {
  resolveCubePresentation,
  type CubePresentation,
  type CubeReviewMode,
} from "@/components/cube/cube-presentation";
import type { CubeMove, CubieState } from "@/lib/cube/types";
import type { QueuedMove } from "@/lib/game/reducer";
import { dictionaries } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";
import type { IntroPhase } from "@/lib/motion/intro-sequence";
import {
  INITIAL_CUBE_INTERACTION,
  cubeInteractionReducer,
  selectCubeCursorIntent,
  selectCubeInteractionLocked,
  type CubeInteractionEvent,
  type CubeInteractionSnapshot,
} from "@/lib/motion/cube-interaction";
import {
  IDLE_CURSOR_INTENT,
  type CursorIntent,
} from "@/lib/motion/cursor-intent";

export {
  resolveCubePresentation,
  type CubePresentation,
  type CubeReviewMode,
} from "@/components/cube/cube-presentation";

export interface CubeSceneProps {
  readonly cube: readonly CubieState[];
  readonly introPhase?: IntroPhase;
  readonly isCelebrating?: boolean;
  readonly locale?: Locale;
  readonly onDropComplete?: () => void;
  readonly onCursorIntentChange?: (intent: CursorIntent) => void;
  readonly onInteractionLockChange?: (locked: boolean) => void;
  readonly onMoveComplete: () => void;
  readonly onMoveRequest: (move: CubeMove) => void;
  readonly onSceneReady?: () => void;
  readonly queue: readonly QueuedMove[];
  readonly reviewMode?: CubeReviewMode;
}

interface SceneBudget {
  readonly dprCap: number;
  readonly viewportWidth: number;
}

interface ScenePalette {
  readonly ambient: string;
  readonly fill: string;
  readonly fog: string;
  readonly ground: string;
}

const VIEW_CONFIG: Readonly<
  Record<
    CubeReviewMode,
    {
      readonly key: readonly [number, number, number];
      readonly keyIntensity: number;
    }
  >
> = Object.freeze({
  neutral: {
    key: [4.8, 7.2, 4.5],
    keyIntensity: 5.6,
  },
  grazing: {
    key: [5.8, 2.1, 1.6],
    keyIntensity: 6.4,
  },
  opposite: {
    key: [-4.5, 6.4, -3.8],
    keyIntensity: 5.8,
  },
});

RectAreaLightUniformsLib.init();

export const ORBIT_MOUSE_BUTTONS = {
  LEFT: MOUSE.ROTATE,
  MIDDLE: undefined,
  RIGHT: MOUSE.ROTATE,
} as const;

export function CubeScene({
  cube,
  introPhase = "ready",
  isCelebrating = false,
  locale = "es",
  onDropComplete,
  onCursorIntentChange,
  onInteractionLockChange,
  onMoveComplete,
  onMoveRequest,
  onSceneReady,
  queue,
  reviewMode = "neutral",
}: CubeSceneProps) {
  const budget = useSceneBudget();
  const presentation = resolveCubePresentation(
    budget.viewportWidth,
    reviewMode,
  );
  const pageVisible = usePageVisibility();
  const reducedMotion = useReducedMotionPreference();
  const handleSceneCreated = useCallback(
    ({ gl }: RootState) => {
      gl.outputColorSpace = SRGBColorSpace;
      gl.toneMapping = ACESFilmicToneMapping;
      gl.toneMappingExposure = 1;
    },
    [],
  );
  return (
    <div
      className="cube-scene"
      data-review-mode={reviewMode}
      role="img"
      aria-label={dictionaries[locale].stageLabel}
      aria-describedby="cube-drag-hint"
      tabIndex={0}
      onContextMenu={(event) => event.preventDefault()}
    >
      <Canvas
        dpr={[1, budget.dprCap]}
        frameloop="demand"
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
        camera={{
          far: 40,
          fov: 34,
          near: 0.1,
          position: presentation.cameraPosition,
        }}
        onCreated={handleSceneCreated}
      >
        <AdaptiveDpr pixelated={false} />
        <CubeStudio
          cube={cube}
          introPhase={introPhase}
          interactionResetKey={locale}
          isCelebrating={isCelebrating}
          onCursorIntentChange={onCursorIntentChange}
          onInteractionLockChange={onInteractionLockChange}
          onMoveComplete={onMoveComplete}
          onMoveRequest={onMoveRequest}
          onDropComplete={onDropComplete}
          onSceneReady={onSceneReady}
          pageVisible={pageVisible}
          palette={LIGHT_PALETTE}
          presentation={presentation}
          queue={queue}
          reducedMotion={reducedMotion}
          reviewMode={reviewMode}
        />
      </Canvas>
    </div>
  );
}

interface CubeStudioProps extends Required<
  Pick<CubeSceneProps, "introPhase" | "isCelebrating" | "reviewMode">
> {
  readonly cube: readonly CubieState[];
  readonly interactionResetKey: Locale;
  readonly onCursorIntentChange?: (intent: CursorIntent) => void;
  readonly onInteractionLockChange?: (locked: boolean) => void;
  readonly onDropComplete?: () => void;
  readonly onMoveComplete: () => void;
  readonly onMoveRequest: (move: CubeMove) => void;
  readonly onSceneReady?: () => void;
  readonly pageVisible: boolean;
  readonly palette: ScenePalette;
  readonly presentation: CubePresentation;
  readonly queue: readonly QueuedMove[];
  readonly reducedMotion: boolean;
}

function CubeStudio({
  cube,
  introPhase,
  interactionResetKey,
  isCelebrating,
  onCursorIntentChange,
  onInteractionLockChange,
  onMoveComplete,
  onMoveRequest,
  onDropComplete,
  onSceneReady,
  pageVisible,
  palette,
  presentation,
  queue,
  reducedMotion,
  reviewMode,
}: CubeStudioProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const view = VIEW_CONFIG[reviewMode];
  const interactionReady = introPhase === "ready";
  const interaction = useCubeInteractionAggregate({
    onCursorIntentChange,
    onInteractionLockChange,
  });
  const handleOrbitEnd = interaction.endOrbit;
  const handleOrbitStart = interaction.startOrbit;
  const resetInteraction = interaction.reset;
  const resetKeyRef = useRef(interactionResetKey);

  useEffect(() => {
    if (resetKeyRef.current === interactionResetKey) {
      return;
    }

    resetKeyRef.current = interactionResetKey;
    resetInteraction();
  }, [interactionResetKey, resetInteraction]);

  const handleOrbitLockChange = useCallback(
    (locked: boolean) => {
      if (controlsRef.current) {
        controlsRef.current.enabled =
          interactionReady && !locked && queue.length === 0;
      }
    },
    [interactionReady, queue.length],
  );

  return (
    <>
      <fog attach="fog" args={[palette.fog, 14, 26]} />
      <ambientLight color={palette.ambient} intensity={0.32} />
      <hemisphereLight args={[palette.fill, palette.ground, 0.68]} />
      <StudioAreaLight
        color="#fff8ed"
        height={4.8}
        intensity={view.keyIntensity}
        position={view.key}
        target={presentation.cubePosition}
        width={5.6}
      />
      <StudioAreaLight
        color="#dce9ff"
        height={4.2}
        intensity={2.8}
        position={[-4.8, 3.8, 5.4]}
        target={presentation.cubePosition}
        width={4.8}
      />
      <StudioAreaLight
        color="#ffffff"
        height={4.8}
        intensity={3.4}
        position={[2.2, 5.4, -6.2]}
        target={presentation.cubePosition}
        width={3.6}
      />

      <CameraRig
        cameraPosition={presentation.cameraPosition}
        cameraTarget={presentation.cameraTarget}
        controlsRef={controlsRef}
      />
      <MagicCube
        cube={cube}
        introPhase={introPhase}
        isCelebrating={isCelebrating}
        onDropComplete={onDropComplete}
        onCursorIntentChange={interaction.setLayerIntent}
        onGestureActiveChange={interaction.setLayerActive}
        onMoveComplete={onMoveComplete}
        onMoveRequest={onMoveRequest}
        onOrbitLockChange={handleOrbitLockChange}
        onSceneReady={onSceneReady}
        pageVisible={pageVisible}
        presentationPosition={presentation.cubePosition}
        presentationScale={presentation.cubeScale}
        queue={queue}
        reducedMotion={reducedMotion}
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={
          interactionReady &&
          !interaction.snapshot.layerActive &&
          queue.length === 0
        }
        autoRotate={false}
        enableDamping={!reducedMotion}
        dampingFactor={0.075}
        enablePan={false}
        enableZoom={false}
        mouseButtons={ORBIT_MOUSE_BUTTONS}
        maxPolarAngle={Math.PI * 0.69}
        minPolarAngle={Math.PI * 0.2}
        onEnd={handleOrbitEnd}
        onStart={handleOrbitStart}
        rotateSpeed={0.62}
        target={presentation.cameraTarget}
      />
    </>
  );
}

interface CubeInteractionAggregateOptions {
  readonly onCursorIntentChange?: (intent: CursorIntent) => void;
  readonly onInteractionLockChange?: (locked: boolean) => void;
}

interface InteractionReport<TCallback, TValue> {
  readonly callback: TCallback;
  readonly value: TValue;
}

function useCubeInteractionAggregate({
  onCursorIntentChange,
  onInteractionLockChange,
}: CubeInteractionAggregateOptions) {
  const [snapshot, dispatch] = useReducer(
    cubeInteractionReducer,
    INITIAL_CUBE_INTERACTION,
  );
  const stateRef = useRef<CubeInteractionSnapshot>(
    INITIAL_CUBE_INTERACTION,
  );
  const cursorCallbackRef = useRef(onCursorIntentChange);
  const lockCallbackRef = useRef(onInteractionLockChange);
  const lastCursorReportRef = useRef<
    InteractionReport<typeof onCursorIntentChange, CursorIntent> | undefined
  >(undefined);
  const lastLockReportRef = useRef<
    InteractionReport<typeof onInteractionLockChange, boolean> | undefined
  >(undefined);
  const reportSnapshot = useCallback((next: CubeInteractionSnapshot) => {
    const cursorCallback = cursorCallbackRef.current;
    const cursorIntent = selectCubeCursorIntent(next);
    const cursorReport = lastCursorReportRef.current;
    if (
      cursorCallback &&
      (cursorReport?.callback !== cursorCallback ||
        cursorReport.value !== cursorIntent)
    ) {
      cursorCallback(cursorIntent);
    }
    lastCursorReportRef.current = {
      callback: cursorCallback,
      value: cursorIntent,
    };

    const lockCallback = lockCallbackRef.current;
    const locked = selectCubeInteractionLocked(next);
    const lockReport = lastLockReportRef.current;
    if (
      lockCallback &&
      (lockReport?.callback !== lockCallback || lockReport.value !== locked)
    ) {
      lockCallback(locked);
    }
    lastLockReportRef.current = { callback: lockCallback, value: locked };
  }, []);

  const update = useCallback(
    (event: CubeInteractionEvent) => {
      const next = cubeInteractionReducer(stateRef.current, event);
      if (next === stateRef.current) {
        return;
      }

      stateRef.current = next;
      dispatch(event);
      reportSnapshot(next);
    },
    [reportSnapshot],
  );

  const setLayerActive = useCallback(
    (active: boolean) => update({ active, type: "layer-active" }),
    [update],
  );
  const setLayerIntent = useCallback(
    (intent: CursorIntent) => update({ intent, type: "layer-intent" }),
    [update],
  );
  const startOrbit = useCallback(
    () => update({ active: true, type: "orbit-active" }),
    [update],
  );
  const endOrbit = useCallback(
    () => update({ active: false, type: "orbit-active" }),
    [update],
  );
  const reset = useCallback(() => update({ type: "reset" }), [update]);

  useEffect(() => {
    cursorCallbackRef.current = onCursorIntentChange;
    lockCallbackRef.current = onInteractionLockChange;
    reportSnapshot(stateRef.current);
  }, [onCursorIntentChange, onInteractionLockChange, reportSnapshot]);

  useEffect(
    () => () => {
      stateRef.current = INITIAL_CUBE_INTERACTION;
      cursorCallbackRef.current?.(IDLE_CURSOR_INTENT);
      lockCallbackRef.current?.(false);
    },
    [],
  );

  return {
    endOrbit,
    reset,
    setLayerActive,
    setLayerIntent,
    snapshot,
    startOrbit,
    stateRef,
  } as const;
}

function StudioAreaLight({
  color,
  height,
  intensity,
  position,
  target,
  width,
}: {
  readonly color: string;
  readonly height: number;
  readonly intensity: number;
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
  readonly width: number;
}) {
  const lightRef = useRef<RectAreaLight>(null);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    lightRef.current?.lookAt(...target);
    lightRef.current?.updateMatrixWorld();
    invalidate();
  }, [invalidate, target]);

  return (
    <rectAreaLight
      ref={lightRef}
      color={color}
      height={height}
      intensity={intensity}
      position={position}
      width={width}
    />
  );
}

function CameraRig({
  cameraPosition,
  cameraTarget,
  controlsRef,
}: {
  readonly cameraPosition: readonly [number, number, number];
  readonly cameraTarget: readonly [number, number, number];
  readonly controlsRef: RefObject<OrbitControlsImpl | null>;
}) {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    camera.position.set(...cameraPosition);
    camera.lookAt(...cameraTarget);
    camera.updateProjectionMatrix();
    controlsRef.current?.target.set(...cameraTarget);
    controlsRef.current?.update();
    invalidate();
  }, [camera, cameraPosition, cameraTarget, controlsRef, invalidate]);

  return null;
}

function useSceneBudget(): SceneBudget {
  const readBudget = useCallback(
    (): SceneBudget => ({
      dprCap: window.innerWidth < 720 ? 1.5 : 1.75,
      viewportWidth: window.innerWidth,
    }),
    [],
  );
  const [budget, setBudget] = useState<SceneBudget>(() => readBudget());

  useEffect(() => {
    const handleResize = () => setBudget(readBudget());
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, [readBudget]);

  return budget;
}

function useReducedMotionPreference(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setReduced(media.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return reduced;
}

const LIGHT_PALETTE: ScenePalette = Object.freeze({
  ambient: "#dfe8ef",
  fill: "#ffffff",
  fog: "#edf1f3",
  ground: "#aab3b9",
});
