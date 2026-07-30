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
  SRGBColorSpace,
} from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { MagicCube } from "@/components/cube/MagicCube";
import type { CubeMove, CubieState } from "@/lib/cube/types";
import type { QueuedMove } from "@/lib/game/reducer";
import { dictionaries } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";

export type CubeReviewMode = "grazing" | "neutral" | "opposite";

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
  readonly isMobile: boolean;
  readonly shadowSize: 512 | 1024;
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
      readonly camera: readonly [number, number, number];
      readonly key: readonly [number, number, number];
      readonly keyIntensity: number;
    }
  >
> = Object.freeze({
  neutral: {
    camera: [6.45, 5.15, 6.85],
    key: [4.8, 7.2, 4.5],
    keyIntensity: 145,
  },
  grazing: {
    camera: [7.5, 2.05, 7.7],
    key: [5.8, 2.1, 1.6],
    keyIntensity: 165,
  },
  opposite: {
    camera: [-6.7, 4.55, -7],
    key: [-4.5, 6.4, -3.8],
    keyIntensity: 150,
  },
});

const MOBILE_CAMERA_POSITIONS: Readonly<
  Record<CubeReviewMode, readonly [number, number, number]>
> = Object.freeze({
  neutral: [5.7, 4.55, 6.05],
  grazing: [6.85, 1.88, 7],
  opposite: [-6.15, 4.2, -6.4],
});
const DESKTOP_CUBE_POSITION = [0.36, 0.45, 0] as const;
const DESKTOP_CAMERA_TARGET = [0.08, -0.04, 0] as const;
const MOBILE_CUBE_POSITION = [0, -0.04, 0] as const;
const MOBILE_CAMERA_TARGET = [0, -0.04, 0] as const;
const DESKTOP_CUBE_SCALE = 0.94;
const MOBILE_CUBE_SCALE = 0.99;

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
  const mobileCameraPosition = MOBILE_CAMERA_POSITIONS[reviewMode];
  const cameraPosition = budget.isMobile
    ? mobileCameraPosition
    : VIEW_CONFIG[reviewMode].camera;
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
          position: cameraPosition,
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
          cameraPosition={cameraPosition}
          cube={cube}
          isCelebrating={isCelebrating}
          isGestureActive={isGestureActive}
          onGestureActiveChange={handleGestureActiveChange}
          onMoveComplete={onMoveComplete}
          onMoveRequest={onMoveRequest}
          pageVisible={pageVisible}
          palette={LIGHT_PALETTE}
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
  readonly cameraPosition: readonly [number, number, number];
  readonly cube: readonly CubieState[];
  readonly isGestureActive: boolean;
  readonly onGestureActiveChange: (active: boolean) => void;
  readonly onMoveComplete: () => void;
  readonly onMoveRequest: (move: CubeMove) => void;
  readonly pageVisible: boolean;
  readonly palette: ScenePalette;
  readonly queue: readonly QueuedMove[];
  readonly reducedMotion: boolean;
}

function CubeStudio({
  budget,
  cameraPosition,
  cube,
  isCelebrating,
  isGestureActive,
  onGestureActiveChange,
  onMoveComplete,
  onMoveRequest,
  pageVisible,
  palette,
  queue,
  reducedMotion,
  reviewMode,
}: CubeStudioProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const view = VIEW_CONFIG[reviewMode];
  const cubePosition = budget.isMobile
    ? MOBILE_CUBE_POSITION
    : DESKTOP_CUBE_POSITION;
  const cameraTarget = budget.isMobile
    ? MOBILE_CAMERA_TARGET
    : DESKTOP_CAMERA_TARGET;
  const cubeScale = budget.isMobile
    ? MOBILE_CUBE_SCALE
    : DESKTOP_CUBE_SCALE;
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
      <ambientLight color={palette.ambient} intensity={0.42} />
      <hemisphereLight args={[palette.fill, palette.ground, 0.82]} />
      <spotLight
        angle={0.78}
        color="#fff8ed"
        decay={2}
        intensity={view.keyIntensity}
        penumbra={0.92}
        position={view.key}
      />
      <spotLight
        angle={0.92}
        color="#dce9ff"
        decay={2}
        intensity={76}
        penumbra={1}
        position={[-4.8, 3.8, 5.4]}
      />
      <spotLight
        angle={0.82}
        color="#ffffff"
        decay={2}
        intensity={88}
        penumbra={0.96}
        position={[2.2, 5.4, -6.2]}
      />

      <CameraRig
        cameraPosition={cameraPosition}
        cameraTarget={cameraTarget}
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
        presentationPosition={cubePosition}
        presentationScale={cubeScale}
        queue={queue}
        reducedMotion={reducedMotion}
      />

      <ContactShadows
        color="#1d252b"
        far={4}
        frames={1}
        opacity={0.25}
        position={[
          cubePosition[0],
          cubePosition[1] - cubeScale * 1.49,
          0,
        ]}
        resolution={budget.shadowSize}
        scale={7.2}
        blur={2.8}
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
        target={cameraTarget}
      />
    </>
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
    (): SceneBudget =>
      window.innerWidth < 720
        ? { dprCap: 1.5, isMobile: true, shadowSize: 512 }
        : { dprCap: 1.75, isMobile: false, shadowSize: 1024 },
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
