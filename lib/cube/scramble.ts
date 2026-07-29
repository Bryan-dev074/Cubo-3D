import { applyMove } from "@/lib/cube/moves";
import { LAYER_NOTATION, createLayerMove } from "@/lib/cube/notation";
import { isSolved } from "@/lib/cube/solved";
import { createSolvedCube } from "@/lib/cube/state";
import type { CubeMove } from "@/lib/cube/types";

const DEFAULT_LENGTH = 20;
const EXTERNAL_LAYERS = LAYER_NOTATION.filter((layer) => layer.layer !== 0);

export function generateScramble(options: {
  readonly length?: number;
  readonly seed?: number;
} = {}): readonly CubeMove[] {
  const length = options.length ?? DEFAULT_LENGTH;
  validateLength(length);

  const seed = options.seed ?? Math.floor(Math.random() * 0x1_0000_0000);
  if (!Number.isInteger(seed)) {
    throw new Error("Scramble seed must be an integer");
  }

  const random = createSeededRandom(seed);

  while (true) {
    const moves: CubeMove[] = [];

    while (moves.length < length) {
      const previous = moves.at(-1);
      const candidates = previous
        ? EXTERNAL_LAYERS.filter((layer) => layer.axis !== previous.axis)
        : EXTERNAL_LAYERS;
      const layer = candidates[Math.floor(random() * candidates.length)];
      const direction = random() < 0.5 ? "clockwise" : "counterclockwise";
      moves.push(createLayerMove(layer, direction));
    }

    const result = moves.reduce((cube, move) => applyMove(cube, move), createSolvedCube());
    if (!isSolved(result)) {
      return Object.freeze(moves);
    }
  }
}

function validateLength(length: number): void {
  if (!Number.isInteger(length) || length < 18 || length > 22) {
    throw new Error("Scramble length must be an integer from 18 to 22");
  }
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000;
  };
}
