"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  AdaptiveDpr,
  ContactShadows,
  OrbitControls,
} from "@react-three/drei";
import {
  ACESFilmicToneMapping,
  type RectAreaLight,
  SRGBColorSpace,
} from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { MagicCube } from "@/components/cube/MagicCube";
import {
  resolveCubePresentation,
  type CubePresentation,
  type CubeReviewMode,
} from "@/components/cube/cube-presentation";
import type { CubeMove, CubieState } from "@/lib/cube/types";
import type { QueuedMove } from "@/lib/game/reducer";
import { dictionaries } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";

export {
  resolveCubePresentation,
  type CubePresentation,
  type CubeReviewMode,
} from "@/components/cube/cube-presentation";

export interface CubeSceneProps {
  readonly cube: readonly CubieState[];
  readonly isCelebrating?: boolean;
  readonly locale?: Locale;
  readonly onInteractionLockChange?: (locked: boolean) => void;
  readonly onMoveComplete: () => void;
  readonly onMoveRequest: (move: CubeMove) => void;
  readonly queue: readonly QueuedMove[];
  readonly reviewMode?: CubeReviewMode;
}

interface SceneBudget {
  readonly dprCap: number;
  readonly shadowSize: 512 | 1024;
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

export function CubeScene({
  cube,
  isCelebrating = false,
  locale = "es",
  onInteractionLockChange,
  onMoveComplete,
  onMoveRequest,
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
  const [isGestureActive, setGestureActive] = useState(false);
  const handleGestureActiveChange = useCallback(
    (active: boolean) => {
      setGestureActive(active);
      onInteractionLockChange?.(active);
    },
    [onInteractionLockChange],
  );

  return (
    <div
      className="cube-scene"
      data-review-mode={reviewMode}
      role="img"
      aria-label={dictionaries[locale].stageLabel}
      aria-describedby="cube-drag-hint"
      tabIndex={0}
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
        onCreated={({ gl }) => {
          gl.outputColorSpace = SRGBColorSpace;
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1;
        }}
      >
        <AdaptiveDpr pixelated={false} />
        <CubeStudio
          budget={budget}
          cube={cube}
          isCelebrating={isCelebrating}
          isGestureActive={isGestureActive}
          onGestureActiveChange={handleGestureActiveChange}
          onMoveComplete={onMoveComplete}
          onMoveRequest={onMoveRequest}
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
  Pick<CubeSceneProps, "isCelebrating" | "reviewMode">
> {
  readonly budget: SceneBudget;
  readonly cube: readonly CubieState[];
  readonly isGestureActive: boolean;
  readonly onGestureActiveChange: (active: boolean) => void;
  readonly onMoveComplete: () => void;
  readonly onMoveRequest: (move: CubeMove) => void;
  readonly pageVisible: boolean;
  readonly palette: ScenePalette;
  readonly presentation: CubePresentation;
  readonly queue: readonly QueuedMove[];
  readonly reducedMotion: boolean;
}

function CubeStudio({
  budget,
  cube,
  isCelebrating,
  isGestureActive,
  onGestureActiveChange,
  onMoveComplete,
  onMoveRequest,
  pageVisible,
  palette,
  presentation,
  queue,
  reducedMotion,
  reviewMode,
}: CubeStudioProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const view = VIEW_CONFIG[reviewMode];
  const handleOrbitLockChange = useCallback(
    (locked: boolean) => {
      if (controlsRef.current) {
        controlsRef.current.enabled = !locked && queue.length === 0;
      }
    },
    [queue.length],
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
        isCelebrating={isCelebrating}
        onGestureActiveChange={onGestureActiveChange}
        onMoveComplete={onMoveComplete}
        onMoveRequest={onMoveRequest}
        onOrbitLockChange={handleOrbitLockChange}
        pageVisible={pageVisible}
        presentationPosition={presentation.cubePosition}
        presentationScale={presentation.cubeScale}
        queue={queue}
        reducedMotion={reducedMotion}
      />

      <ContactShadows
        color="#1d252b"
        far={4}
        frames={1}
        opacity={0.36}
        position={[
          presentation.cubePosition[0],
          presentation.cubePosition[1] -
            presentation.cubeScale * 1.49,
          0,
        ]}
        resolution={budget.shadowSize}
        scale={4.8}
        blur={1.9}
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={!isGestureActive && queue.length === 0}
        autoRotate={false}
        enableDamping={!reducedMotion}
        dampingFactor={0.075}
        enablePan={false}
        enableZoom={false}
        maxPolarAngle={Math.PI * 0.69}
        minPolarAngle={Math.PI * 0.2}
        rotateSpeed={0.62}
        target={presentation.cameraTarget}
      />
    </>
  );
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
      shadowSize: window.innerWidth < 720 ? 512 : 1024,
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

function usePageVisibility(): boolean {
  const [visible, setVisible] = useState(() => document.visibilityState !== "hidden");

  useEffect(() => {
    const handleVisibility = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  return visible;
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
