import type { Axis, CubeMove } from "@/lib/cube/types";

export type CursorMode =
  | "idle"
  | "action"
  | "layer-ready"
  | "layer-drag"
  | "orbit"
  | "disabled";

export type CursorDirection = "negative" | "positive";

export interface CursorIntent {
  readonly axis?: Axis;
  readonly direction?: CursorDirection;
  readonly mode: CursorMode;
}

function freezeIntent(intent: CursorIntent): CursorIntent {
  return Object.freeze(intent);
}

export const IDLE_CURSOR_INTENT = freezeIntent({ mode: "idle" });
export const ACTION_CURSOR_INTENT = freezeIntent({ mode: "action" });
export const LAYER_READY_CURSOR_INTENT = freezeIntent({ mode: "layer-ready" });
export const ORBIT_CURSOR_INTENT = freezeIntent({ mode: "orbit" });
export const DISABLED_CURSOR_INTENT = freezeIntent({ mode: "disabled" });

const STATELESS_INTENTS: Readonly<
  Record<Exclude<CursorMode, "layer-drag">, CursorIntent>
> = Object.freeze({
  action: ACTION_CURSOR_INTENT,
  disabled: DISABLED_CURSOR_INTENT,
  idle: IDLE_CURSOR_INTENT,
  "layer-ready": LAYER_READY_CURSOR_INTENT,
  orbit: ORBIT_CURSOR_INTENT,
});

const LAYER_DRAG_INTENTS: Readonly<
  Record<Axis, Readonly<Record<CursorDirection, CursorIntent>>>
> = Object.freeze({
  x: Object.freeze({
    negative: freezeIntent({
      axis: "x",
      direction: "negative",
      mode: "layer-drag",
    }),
    positive: freezeIntent({
      axis: "x",
      direction: "positive",
      mode: "layer-drag",
    }),
  }),
  y: Object.freeze({
    negative: freezeIntent({
      axis: "y",
      direction: "negative",
      mode: "layer-drag",
    }),
    positive: freezeIntent({
      axis: "y",
      direction: "positive",
      mode: "layer-drag",
    }),
  }),
  z: Object.freeze({
    negative: freezeIntent({
      axis: "z",
      direction: "negative",
      mode: "layer-drag",
    }),
    positive: freezeIntent({
      axis: "z",
      direction: "positive",
      mode: "layer-drag",
    }),
  }),
});

export function normalizeCursorIntent(intent: CursorIntent): CursorIntent {
  if (intent.mode !== "layer-drag") {
    return STATELESS_INTENTS[intent.mode];
  }

  if (!intent.axis || !intent.direction) {
    return LAYER_READY_CURSOR_INTENT;
  }

  return LAYER_DRAG_INTENTS[intent.axis][intent.direction];
}

export function cursorIntentForMove(move: CubeMove): CursorIntent {
  return LAYER_DRAG_INTENTS[move.axis][
    move.turns < 0 ? "negative" : "positive"
  ];
}
