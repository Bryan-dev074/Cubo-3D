import { describe, expect, it } from "vitest";

import {
  INITIAL_CUBE_INTERACTION,
  cubeInteractionReducer,
  selectCubeCursorIntent,
  selectCubeInteractionLocked,
} from "@/lib/motion/cube-interaction";
import {
  IDLE_CURSOR_INTENT,
  LAYER_READY_CURSOR_INTENT,
  ORBIT_CURSOR_INTENT,
  cursorIntentForMove,
} from "@/lib/motion/cursor-intent";

describe("cube interaction aggregate", () => {
  it("keeps orbit ownership when a stale layer cleanup arrives", () => {
    const orbiting = cubeInteractionReducer(INITIAL_CUBE_INTERACTION, {
      active: true,
      type: "orbit-active",
    });
    const afterLayerCleanup = cubeInteractionReducer(orbiting, {
      active: false,
      type: "layer-active",
    });

    expect(selectCubeInteractionLocked(afterLayerCleanup)).toBe(true);
    expect(selectCubeCursorIntent(afterLayerCleanup)).toBe(
      ORBIT_CURSOR_INTENT,
    );
  });

  it("returns orbit to idle when no layer gesture owns the pointer", () => {
    const readyHover = cubeInteractionReducer(INITIAL_CUBE_INTERACTION, {
      intent: LAYER_READY_CURSOR_INTENT,
      type: "layer-intent",
    });
    const orbiting = cubeInteractionReducer(readyHover, {
      active: true,
      type: "orbit-active",
    });
    const ended = cubeInteractionReducer(orbiting, {
      active: false,
      type: "orbit-active",
    });

    expect(selectCubeCursorIntent(ended)).toBe(IDLE_CURSOR_INTENT);
  });

  it("restores the live layer channel after orbit ends", () => {
    const layerDrag = cursorIntentForMove({
      axis: "z",
      layer: 1,
      turns: -1,
    });
    const layerOwned = cubeInteractionReducer(
      cubeInteractionReducer(INITIAL_CUBE_INTERACTION, {
        active: true,
        type: "layer-active",
      }),
      { intent: layerDrag, type: "layer-intent" },
    );
    const orbiting = cubeInteractionReducer(layerOwned, {
      active: true,
      type: "orbit-active",
    });
    const restored = cubeInteractionReducer(orbiting, {
      active: false,
      type: "orbit-active",
    });

    expect(selectCubeCursorIntent(orbiting)).toBe(ORBIT_CURSOR_INTENT);
    expect(selectCubeInteractionLocked(restored)).toBe(true);
    expect(selectCubeCursorIntent(restored)).toBe(layerDrag);
  });

  it("normalizes layer intent and preserves references for duplicate events", () => {
    const ready = cubeInteractionReducer(INITIAL_CUBE_INTERACTION, {
      intent: { axis: "x", mode: "layer-ready" },
      type: "layer-intent",
    });

    expect(ready.layerIntent).toBe(LAYER_READY_CURSOR_INTENT);
    expect(
      cubeInteractionReducer(ready, {
        intent: { mode: "layer-ready" },
        type: "layer-intent",
      }),
    ).toBe(ready);
  });

  it("resets every channel to a neutral unlocked snapshot", () => {
    const active = cubeInteractionReducer(
      cubeInteractionReducer(INITIAL_CUBE_INTERACTION, {
        active: true,
        type: "layer-active",
      }),
      { active: true, type: "orbit-active" },
    );

    const reset = cubeInteractionReducer(active, { type: "reset" });

    expect(reset).toBe(INITIAL_CUBE_INTERACTION);
    expect(selectCubeInteractionLocked(reset)).toBe(false);
    expect(selectCubeCursorIntent(reset)).toBe(IDLE_CURSOR_INTENT);
  });
});
