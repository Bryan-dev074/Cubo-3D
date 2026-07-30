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
    camera: [5.45, 4.35, 5.8],
    key: [4.8, 7.2, 4.5],
    keyIntensity: 3.25,
  },
  grazing: {
    camera: [6.35, 1.75, 6.5],
    key: [5.8, 2.1, 1.6],
    keyIntensity: 4.15,
  },
  opposite: {
    camera: [-5.65, 3.85, -5.9],
    key: [-4.5, 6.4, -3.8],
    keyIntensity: 3.45,
  },
});

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
  const pageVisible = usePageVisibility();
  const reducedMotion = useReducedMotionPreference();
  const darkMode = useDarkModePreference();
  const [isGestureActive, setGestureActive] = useState(false);
  const [isOrbiting, setOrbiting] = useState(false);
  const [isKeyboardInteracting, setKeyboardInteracting] = useState(false);
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
      tabIndex={0}
      onBlur={() => setKeyboardInteracting(false)}
      onKeyDown={() => setKeyboardInteracting(true)}
      onKeyUp={() => setKeyboardInteracting(false)}
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
          position: VIEW_CONFIG[reviewMode].camera,
        }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = SRGBColorSpace;
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
        }}
      >
        <AdaptiveDpr pixelated={false} />
        <CubeStudio
          budget={budget}
          cube={cube}
          isCelebrating={isCelebrating}
          isGestureActive={isGestureActive}
          isKeyboardInteracting={isKeyboardInteracting}
          isOrbiting={isOrbiting}
          onGestureActiveChange={handleGestureActiveChange}
          onMoveComplete={onMoveComplete}
          onMoveRequest={onMoveRequest}
          onOrbitingChange={setOrbiting}
          pageVisible={pageVisible}
          palette={darkMode ? DARK_PALETTE : LIGHT_PALETTE}
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
  readonly isKeyboardInteracting: boolean;
  readonly isOrbiting: boolean;
  readonly onGestureActiveChange: (active: boolean) => void;
  readonly onMoveComplete: () => void;
  readonly onMoveRequest: (move: CubeMove) => void;
  readonly onOrbitingChange: (active: boolean) => void;
  readonly pageVisible: boolean;
  readonly palette: ScenePalette;
  readonly queue: readonly QueuedMove[];
  readonly reducedMotion: boolean;
}

function CubeStudio({
  budget,
  cube,
  isCelebrating,
  isGestureActive,
  isKeyboardInteracting,
  isOrbiting,
  onGestureActiveChange,
  onMoveComplete,
  onMoveRequest,
  onOrbitingChange,
  pageVisible,
  palette,
  queue,
  reducedMotion,
  reviewMode,
}: CubeStudioProps) {
  const invalidate = useThree((state) => state.invalidate);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const view = VIEW_CONFIG[reviewMode];

  const handleOrbitStart = useCallback(() => {
    if (!isGestureActive) {
      onOrbitingChange(true);
    }
  }, [isGestureActive, onOrbitingChange]);

  const handleOrbitEnd = useCallback(() => {
    onOrbitingChange(false);
    invalidate();
  }, [invalidate, onOrbitingChange]);
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
      <ambientLight color={palette.ambient} intensity={0.55} />
      <hemisphereLight args={[palette.fill, palette.ground, 1.15]} />
      <directionalLight
        color="#fff8ed"
        intensity={view.keyIntensity}
        position={view.key}
      />
      <directionalLight color="#cfe0ff" intensity={1.35} position={[-4.5, 3.2, 5.2]} />
      <directionalLight color="#ffffff" intensity={1.6} position={[1.5, 4.8, -6]} />

      <CameraRig controlsRef={controlsRef} reviewMode={reviewMode} />
      <MagicCube
        cube={cube}
        isCelebrating={isCelebrating}
        isKeyboardInteracting={isKeyboardInteracting}
        isOrbiting={isOrbiting}
        onGestureActiveChange={onGestureActiveChange}
        onMoveComplete={onMoveComplete}
        onMoveRequest={onMoveRequest}
        onOrbitLockChange={handleOrbitLockChange}
        pageVisible={pageVisible}
        queue={queue}
        reducedMotion={reducedMotion}
      />

      <ContactShadows
        color="#1d252b"
        far={4}
        frames={1}
        opacity={0.3}
        position={[0, -1.58, 0]}
        resolution={budget.shadowSize}
        scale={8}
        blur={2.7}
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={!isGestureActive && queue.length === 0}
        enableDamping={!reducedMotion}
        dampingFactor={0.075}
        enablePan={false}
        enableZoom={false}
        maxPolarAngle={Math.PI * 0.69}
        minPolarAngle={Math.PI * 0.2}
        rotateSpeed={0.62}
        target={[0, 0, 0]}
        onChange={() => invalidate()}
        onEnd={handleOrbitEnd}
        onStart={handleOrbitStart}
      />
    </>
  );
}

function CameraRig({
  controlsRef,
  reviewMode,
}: {
  readonly controlsRef: RefObject<OrbitControlsImpl | null>;
  readonly reviewMode: CubeReviewMode;
}) {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    camera.position.set(...VIEW_CONFIG[reviewMode].camera);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    controlsRef.current?.target.set(0, 0, 0);
    controlsRef.current?.update();
    invalidate();
  }, [camera, controlsRef, invalidate, reviewMode]);

  return null;
}

function useSceneBudget(): SceneBudget {
  const readBudget = useCallback(
    (): SceneBudget =>
      window.innerWidth < 720
        ? { dprCap: 1.5, shadowSize: 512 }
        : { dprCap: 1.75, shadowSize: 1024 },
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

const DARK_PALETTE: ScenePalette = Object.freeze({
  ambient: "#8a99a3",
  fill: "#dce6ec",
  fog: "#1b2125",
  ground: "#39434a",
});

function useDarkModePreference(): boolean {
  const [dark, setDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setDark(media.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return dark;
}
