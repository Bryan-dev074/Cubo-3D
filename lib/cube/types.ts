export type AxisValue = -1 | 0 | 1;
export type Axis = "x" | "y" | "z";
export type QuarterTurn = -1 | 1 | 2;

export type Vec3i = readonly [AxisValue, AxisValue, AxisValue];
export type Mat3i = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export interface CubieState {
  readonly id: string;
  readonly home: Vec3i;
  readonly position: Vec3i;
  readonly orientation: Mat3i;
}

export interface CubeMove {
  readonly axis: Axis;
  readonly layer: AxisValue;
  readonly turns: QuarterTurn;
}
