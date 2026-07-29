"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useRef,
  useSyncExternalStore,
} from "react";

import { CubeLoadingPoster } from "@/components/cube/CubeLoadingPoster";
import type { CubeReviewMode } from "@/components/cube/CubeScene";
import { SceneErrorBoundary } from "@/components/cube/SceneErrorBoundary";
import { SceneFallback } from "@/components/cube/SceneFallback";
import type { CubieState, CubeMove } from "@/lib/cube/types";
import type { QueuedMove } from "@/lib/game/reducer";

export type WebGLDetector = () => boolean;

export interface CubeCanvasProps {
  readonly cube: readonly CubieState[];
  readonly queue: readonly QueuedMove[];
  readonly onMoveComplete: () => void;
  readonly onMoveRequest: (move: CubeMove) => void;
  readonly purchaseHref: string;
  readonly isCelebrating?: boolean;
  readonly reviewMode?: CubeReviewMode;
  readonly webGLDetector?: WebGLDetector;
}

const DynamicCubeScene = dynamic(
  () => import("@/components/cube/CubeScene").then(({ CubeScene }) => CubeScene),
  {
    ssr: false,
    loading: () => <CubeLoadingPoster eager />,
  },
);

const subscribeToStaticEnvironment = () => () => undefined;
const readServerWebGL = () => null;

export function detectWebGL(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ??
        canvas.getContext("webgl"),
    );
  } catch {
    return false;
  }
}

export function CubeCanvas({
  purchaseHref,
  webGLDetector = detectWebGL,
  ...sceneProps
}: CubeCanvasProps) {
  const detectionRef = useRef<{
    readonly detector: WebGLDetector;
    readonly result: boolean;
  } | null>(null);
  const readClientWebGL = useCallback(() => {
    if (detectionRef.current?.detector !== webGLDetector) {
      detectionRef.current = {
        detector: webGLDetector,
        result: webGLDetector(),
      };
    }
    return detectionRef.current.result;
  }, [webGLDetector]);
  const hasWebGL = useSyncExternalStore(
    subscribeToStaticEnvironment,
    readClientWebGL,
    readServerWebGL,
  );

  if (hasWebGL === null) {
    return (
      <div className="cube-canvas-shell">
        <CubeLoadingPoster eager />
      </div>
    );
  }

  if (!hasWebGL) {
    return (
      <div className="cube-canvas-shell">
        <SceneFallback purchaseHref={purchaseHref} reason="webgl" />
      </div>
    );
  }

  return (
    <div className="cube-canvas-shell">
      <SceneErrorBoundary purchaseHref={purchaseHref}>
        <DynamicCubeScene {...sceneProps} />
      </SceneErrorBoundary>
    </div>
  );
}
