"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useSyncExternalStore,
} from "react";

import { CubeLoadingPoster } from "@/components/cube/CubeLoadingPoster";
import type { CubeReviewMode } from "@/components/cube/CubeScene";
import { SceneErrorBoundary } from "@/components/cube/SceneErrorBoundary";
import { SceneFallback } from "@/components/cube/SceneFallback";
import type { CubieState, CubeMove } from "@/lib/cube/types";
import type { QueuedMove } from "@/lib/game/reducer";
import type { Locale } from "@/lib/i18n/types";

export type WebGLDetector = () => boolean;

export interface CubeCanvasProps {
  readonly cube: readonly CubieState[];
  readonly queue: readonly QueuedMove[];
  readonly onMoveComplete: () => void;
  readonly onMoveRequest: (move: CubeMove) => void;
  readonly purchaseHref: string;
  readonly isCelebrating?: boolean;
  readonly locale?: Locale;
  readonly onInteractionLockChange?: (locked: boolean) => void;
  readonly onSceneError?: (reason: "error" | "webgl") => void;
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
  locale = "es",
  onSceneError,
  purchaseHref,
  webGLDetector = detectWebGL,
  ...sceneProps
}: CubeCanvasProps) {
  const [detectionRevision, retryDetection] = useReducer(
    (revision: number) => revision + 1,
    0,
  );
  const detectionRef = useRef<{
    readonly detector: WebGLDetector;
    readonly revision: number;
    readonly result: boolean;
  } | null>(null);
  const readClientWebGL = useCallback(() => {
    if (
      detectionRef.current?.detector !== webGLDetector ||
      detectionRef.current.revision !== detectionRevision
    ) {
      detectionRef.current = {
        detector: webGLDetector,
        revision: detectionRevision,
        result: webGLDetector(),
      };
    }
    return detectionRef.current.result;
  }, [detectionRevision, webGLDetector]);
  const handleRetry = useCallback(() => {
    detectionRef.current = null;
    retryDetection();
  }, []);
  const hasWebGL = useSyncExternalStore(
    subscribeToStaticEnvironment,
    readClientWebGL,
    readServerWebGL,
  );

  useEffect(() => {
    if (hasWebGL === false) {
      onSceneError?.("webgl");
    }
  }, [hasWebGL, onSceneError]);

  if (hasWebGL === null) {
    return (
      <div className="cube-canvas-shell">
        <CubeLoadingPoster eager locale={locale} />
      </div>
    );
  }

  if (!hasWebGL) {
    return (
      <div className="cube-canvas-shell">
        <SceneFallback
          locale={locale}
          onRetry={handleRetry}
          purchaseHref={purchaseHref}
          reason="webgl"
        />
      </div>
    );
  }

  return (
    <div className="cube-canvas-shell">
      <SceneErrorBoundary
        key={detectionRevision}
        locale={locale}
        onSceneError={onSceneError}
        purchaseHref={purchaseHref}
      >
        <DynamicCubeScene {...sceneProps} locale={locale} />
      </SceneErrorBoundary>
    </div>
  );
}
