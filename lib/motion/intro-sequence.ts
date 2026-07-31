export type IntroPhase = "sealed" | "opening" | "reveal" | "drop" | "ready";

export interface IntroState {
  readonly phase: IntroPhase;
  readonly reducedMotion: boolean;
  readonly sceneReady: boolean;
}

export type IntroEvent =
  | { readonly type: "start" }
  | { readonly type: "package-opened" }
  | { readonly type: "scene-ready" }
  | { readonly type: "reveal-timeout" }
  | { readonly type: "drop-complete" }
  | { readonly type: "skip" };

export const INTRO_PACKAGE_MS = 1_350;
export const INTRO_REDUCED_MS = 180;
export const INTRO_DROP_MS = 650;

export function createIntroState(reducedMotion: boolean): IntroState {
  return {
    phase: "sealed",
    reducedMotion,
    sceneReady: false,
  };
}

export function introReducer(
  state: IntroState,
  event: IntroEvent,
): IntroState {
  if (state.phase === "ready") {
    return state;
  }
  if (event.type === "skip") {
    return { ...state, phase: "ready" };
  }
  if (event.type === "scene-ready") {
    if (state.sceneReady) {
      return state;
    }
    return {
      ...state,
      sceneReady: true,
      phase: state.phase === "reveal" ? "ready" : state.phase,
    };
  }
  if (event.type === "start" && state.phase === "sealed") {
    return { ...state, phase: "opening" };
  }
  if (event.type === "package-opened" && state.phase === "opening") {
    return {
      ...state,
      phase: state.reducedMotion
        ? "ready"
        : state.sceneReady
          ? "drop"
          : "reveal",
    };
  }
  if (event.type === "drop-complete" && state.phase === "drop") {
    return { ...state, phase: "ready" };
  }
  if (event.type === "reveal-timeout" && state.phase === "reveal") {
    return { ...state, phase: "ready" };
  }
  return state;
}
