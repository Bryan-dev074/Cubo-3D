import { describe, expect, it } from "vitest";

import {
  ACTION_CURSOR_INTENT,
  DISABLED_CURSOR_INTENT,
  IDLE_CURSOR_INTENT,
  LAYER_READY_CURSOR_INTENT,
  ORBIT_CURSOR_INTENT,
  cursorIntentForMove,
  normalizeCursorIntent,
} from "@/lib/motion/cursor-intent";

describe("cursor intent", () => {
  it("derives axis and negative direction from a real layer move", () => {
    expect(cursorIntentForMove({ axis: "z", layer: 1, turns: -1 })).toEqual({
      axis: "z",
      direction: "negative",
      mode: "layer-drag",
    });
  });

  it("derives a positive direction from positive and half turns", () => {
    expect(cursorIntentForMove({ axis: "x", layer: 0, turns: 1 })).toEqual({
      axis: "x",
      direction: "positive",
      mode: "layer-drag",
    });
    expect(cursorIntentForMove({ axis: "y", layer: -1, turns: 2 })).toEqual({
      axis: "y",
      direction: "positive",
      mode: "layer-drag",
    });
  });

  it("returns stable frozen objects for every stateless mode", () => {
    const cases = [
      ["idle", IDLE_CURSOR_INTENT],
      ["action", ACTION_CURSOR_INTENT],
      ["layer-ready", LAYER_READY_CURSOR_INTENT],
      ["orbit", ORBIT_CURSOR_INTENT],
      ["disabled", DISABLED_CURSOR_INTENT],
    ] as const;

    for (const [mode, expected] of cases) {
      expect(normalizeCursorIntent({ axis: "x", mode })).toBe(expected);
      expect(Object.isFrozen(expected)).toBe(true);
    }
  });

  it("deduplicates and freezes directional layer intents", () => {
    const first = normalizeCursorIntent({
      axis: "y",
      direction: "negative",
      mode: "layer-drag",
    });
    const second = cursorIntentForMove({ axis: "y", layer: 1, turns: -1 });

    expect(first).toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
  });

  it("falls back to layer-ready when a drag has no complete direction", () => {
    expect(normalizeCursorIntent({ axis: "z", mode: "layer-drag" })).toBe(
      LAYER_READY_CURSOR_INTENT,
    );
    expect(
      normalizeCursorIntent({ direction: "positive", mode: "layer-drag" }),
    ).toBe(LAYER_READY_CURSOR_INTENT);
  });
});
