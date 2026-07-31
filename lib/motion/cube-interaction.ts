import {
  IDLE_CURSOR_INTENT,
  ORBIT_CURSOR_INTENT,
  normalizeCursorIntent,
  type CursorIntent,
} from "@/lib/motion/cursor-intent";

export interface CubeInteractionSnapshot {
  readonly layerActive: boolean;
  readonly layerIntent: CursorIntent;
  readonly orbitActive: boolean;
}

export type CubeInteractionEvent =
  | { readonly active: boolean; readonly type: "layer-active" }
  | { readonly intent: CursorIntent; readonly type: "layer-intent" }
  | { readonly active: boolean; readonly type: "orbit-active" }
  | { readonly type: "reset" };

export const INITIAL_CUBE_INTERACTION: CubeInteractionSnapshot = Object.freeze({
  layerActive: false,
  layerIntent: IDLE_CURSOR_INTENT,
  orbitActive: false,
});

export function cubeInteractionReducer(
  state: CubeInteractionSnapshot,
  event: CubeInteractionEvent,
): CubeInteractionSnapshot {
  if (event.type === "reset") {
    return INITIAL_CUBE_INTERACTION;
  }

  if (event.type === "layer-active") {
    return event.active === state.layerActive
      ? state
      : { ...state, layerActive: event.active };
  }

  if (event.type === "orbit-active") {
    if (event.active === state.orbitActive) {
      return state;
    }

    return {
      ...state,
      layerIntent:
        !event.active && !state.layerActive
          ? IDLE_CURSOR_INTENT
          : state.layerIntent,
      orbitActive: event.active,
    };
  }

  const layerIntent = normalizeCursorIntent(event.intent);
  return layerIntent === state.layerIntent ? state : { ...state, layerIntent };
}

export function selectCubeInteractionLocked(
  state: CubeInteractionSnapshot,
): boolean {
  return state.layerActive || state.orbitActive;
}

export function selectCubeCursorIntent(
  state: CubeInteractionSnapshot,
): CursorIntent {
  return state.orbitActive ? ORBIT_CURSOR_INTENT : state.layerIntent;
}
