import { describe, expect, it } from "vitest";

import {
  createIntroState,
  introReducer,
} from "@/lib/motion/intro-sequence";

describe("introReducer", () => {
  it("runs the full drop only when the scene is ready before the package opens", () => {
    let state = createIntroState(false);
    state = introReducer(state, { type: "start" });
    expect(state.phase).toBe("opening");

    state = introReducer(state, { type: "scene-ready" });
    expect(state.phase).toBe("opening");

    state = introReducer(state, { type: "package-opened" });
    expect(state.phase).toBe("drop");

    state = introReducer(state, { type: "drop-complete" });
    expect(state.phase).toBe("ready");
  });

  it("is idempotent and skips motion when reduced motion is enabled", () => {
    let reduced = introReducer(createIntroState(true), { type: "start" });
    expect(reduced.phase).toBe("opening");
    reduced = introReducer(reduced, { type: "package-opened" });
    expect(reduced.phase).toBe("ready");
    expect(introReducer(reduced, { type: "drop-complete" })).toBe(reduced);
  });

  it("waits in reveal until the scene is ready", () => {
    let state = introReducer(createIntroState(false), { type: "start" });
    state = introReducer(state, { type: "package-opened" });

    expect(state).toMatchObject({ phase: "reveal", sceneReady: false });
  });

  it("starts the drop whenever scene readiness arrives after the package opens", () => {
    let early = introReducer(createIntroState(false), { type: "start" });
    early = introReducer(early, { type: "scene-ready" });
    expect(early).toMatchObject({ phase: "opening", sceneReady: true });
    expect(introReducer(early, { type: "package-opened" })).toMatchObject({
      phase: "drop",
      sceneReady: true,
    });

    let late = introReducer(createIntroState(false), { type: "start" });
    late = introReducer(late, { type: "package-opened" });
    expect(introReducer(late, { type: "scene-ready" })).toMatchObject({
      phase: "drop",
      sceneReady: true,
    });
  });

  it("ends reveal when its visible-time watchdog expires", () => {
    const opening = introReducer(createIntroState(false), { type: "start" });
    const reveal = introReducer(opening, { type: "package-opened" });

    expect(introReducer(reveal, { type: "reveal-timeout" })).toMatchObject({
      phase: "ready",
      sceneReady: false,
    });
    expect(introReducer(opening, { type: "reveal-timeout" })).toBe(opening);
  });

  it("returns the same state for duplicate and invalid events", () => {
    const sealed = createIntroState(false);
    expect(introReducer(sealed, { type: "package-opened" })).toBe(sealed);
    expect(introReducer(sealed, { type: "drop-complete" })).toBe(sealed);

    const opening = introReducer(sealed, { type: "start" });
    const readyEarly = introReducer(opening, { type: "scene-ready" });
    expect(introReducer(readyEarly, { type: "scene-ready" })).toBe(
      readyEarly,
    );

    const sceneReady = introReducer(opening, { type: "scene-ready" });
    const drop = introReducer(sceneReady, { type: "package-opened" });
    expect(introReducer(drop, { type: "scene-ready" })).toBe(drop);
    expect(introReducer(drop, { type: "start" })).toBe(drop);
  });
});
