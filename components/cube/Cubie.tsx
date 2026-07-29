import { memo, type Ref } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { Group } from "three";

import {
  CUBIE_SPACING,
  STICKER_OFFSET,
  type CubeRenderResources,
  type StickerColor,
} from "@/components/cube/cube-materials";
import type { CubieState } from "@/lib/cube/types";

export interface StickerDescriptor {
  readonly name: string;
  readonly normal: readonly [number, number, number];
  readonly color: StickerColor;
  readonly position: readonly [number, number, number];
  readonly rotation: readonly [number, number, number];
}

export interface CubiePointerHandlers {
  readonly onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
  readonly onPointerMove: (event: ThreeEvent<PointerEvent>) => void;
  readonly onPointerUp: (event: ThreeEvent<PointerEvent>) => void;
}

interface CubieProps {
  readonly cubie: CubieState;
  readonly handlers: CubiePointerHandlers;
  readonly pivotRef: Ref<Group>;
  readonly resources: CubeRenderResources;
}

const FACE_DEFINITIONS = [
  {
    axis: 0,
    sign: 1,
    face: "right",
    color: "red",
    normal: [1, 0, 0],
    rotation: [0, Math.PI / 2, 0],
  },
  {
    axis: 0,
    sign: -1,
    face: "left",
    color: "orange",
    normal: [-1, 0, 0],
    rotation: [0, -Math.PI / 2, 0],
  },
  {
    axis: 1,
    sign: 1,
    face: "up",
    color: "white",
    normal: [0, 1, 0],
    rotation: [-Math.PI / 2, 0, 0],
  },
  {
    axis: 1,
    sign: -1,
    face: "down",
    color: "yellow",
    normal: [0, -1, 0],
    rotation: [Math.PI / 2, 0, 0],
  },
  {
    axis: 2,
    sign: 1,
    face: "front",
    color: "blue",
    normal: [0, 0, 1],
    rotation: [0, 0, 0],
  },
  {
    axis: 2,
    sign: -1,
    face: "back",
    color: "green",
    normal: [0, 0, -1],
    rotation: [0, Math.PI, 0],
  },
] as const satisfies readonly {
  readonly axis: 0 | 1 | 2;
  readonly sign: -1 | 1;
  readonly face: string;
  readonly color: StickerColor;
  readonly normal: readonly [number, number, number];
  readonly rotation: readonly [number, number, number];
}[];

export function createStickerDescriptors(cubie: CubieState): readonly StickerDescriptor[] {
  return FACE_DEFINITIONS.filter(
    ({ axis, sign }) => cubie.home[axis] === sign,
  ).map(({ color, face, normal, rotation }) => ({
    name: `sticker:${cubie.id}:${face}`,
    color,
    normal,
    position: [
      normal[0] * STICKER_OFFSET,
      normal[1] * STICKER_OFFSET,
      normal[2] * STICKER_OFFSET,
    ],
    rotation,
  }));
}

export const Cubie = memo(function Cubie({
  cubie,
  handlers,
  pivotRef,
  resources,
}: CubieProps) {
  const stickers = createStickerDescriptors(cubie);

  return (
    <group
      {...handlers}
      ref={pivotRef}
      name={`cubie-pivot:${cubie.id}`}
      position={[
        cubie.position[0] * CUBIE_SPACING,
        cubie.position[1] * CUBIE_SPACING,
        cubie.position[2] * CUBIE_SPACING,
      ]}
      userData={{
        cubePart: "cubie-pivot",
        cubieId: cubie.id,
        home: cubie.home,
        collider: { type: "box", size: [0.94, 0.94, 0.94] },
        destructionGroup: `cubie:${cubie.id}`,
      }}
    >
      <mesh
        castShadow
        receiveShadow
        name={`cubie-body:${cubie.id}`}
        geometry={resources.bodyGeometry}
        material={resources.bodyMaterial}
        userData={{
          cubePart: "body",
          cubieId: cubie.id,
          explodeWithParent: true,
        }}
      />
      {stickers.map((sticker) => (
        <mesh
          key={sticker.name}
          castShadow
          receiveShadow
          name={sticker.name}
          geometry={resources.stickerGeometry}
          material={resources.stickerMaterials[sticker.color]}
          position={sticker.position}
          rotation={sticker.rotation}
          userData={{
            cubePart: "sticker",
            cubieId: cubie.id,
            color: sticker.color,
            homeNormal: sticker.normal,
            explodeWithParent: true,
          }}
        />
      ))}
    </group>
  );
});
