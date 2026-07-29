import {
  Color,
  MeshPhysicalMaterial,
  SRGBColorSpace,
  Texture,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export const CUBIE_SPACING = 1.04;
export const BODY_SIZE = 0.94;
export const STICKER_OFFSET = 0.477;

export type StickerColor = "blue" | "green" | "orange" | "red" | "white" | "yellow";

export interface CubeRenderResources {
  readonly bodyGeometry: RoundedBoxGeometry;
  readonly stickerGeometry: RoundedBoxGeometry;
  readonly bodyMaterial: MeshPhysicalMaterial;
  readonly stickerMaterials: Readonly<Record<StickerColor, MeshPhysicalMaterial>>;
}

const STICKER_COLORS: Readonly<Record<StickerColor, number>> = Object.freeze({
  blue: 0x145bc5,
  green: 0x31844b,
  orange: 0xf47b20,
  red: 0xe6382d,
  white: 0xf0f1ec,
  yellow: 0xf3c316,
});

export function createCubeRenderResources(): CubeRenderResources {
  const bodyGeometry = new RoundedBoxGeometry(BODY_SIZE, BODY_SIZE, BODY_SIZE, 5, 0.105);
  bodyGeometry.name = "shared-rounded-cubie-body";

  const stickerGeometry = new RoundedBoxGeometry(0.735, 0.735, 0.038, 5, 0.075);
  stickerGeometry.name = "shared-rounded-sticker";

  const bodyMaterial = new MeshPhysicalMaterial({
    name: "shared-graphite-satin-plastic",
    color: new Color(0x111416),
    metalness: 0,
    roughness: 0.38,
    clearcoat: 0.18,
    clearcoatRoughness: 0.46,
    envMapIntensity: 0.64,
  });

  const stickerMaterials = Object.fromEntries(
    Object.entries(STICKER_COLORS).map(([name, color]) => [
      name,
      new MeshPhysicalMaterial({
        name: `shared-${name}-sticker-satin`,
        color: new Color(color),
        metalness: 0,
        roughness: 0.23,
        clearcoat: 0.34,
        clearcoatRoughness: 0.3,
        envMapIntensity: 0.68,
      }),
    ]),
  ) as Record<StickerColor, MeshPhysicalMaterial>;

  return {
    bodyGeometry,
    stickerGeometry,
    bodyMaterial,
    stickerMaterials: Object.freeze(stickerMaterials),
  };
}

export function disposeCubeRenderResources(resources: CubeRenderResources): void {
  resources.bodyGeometry.dispose();
  resources.stickerGeometry.dispose();
  resources.bodyMaterial.dispose();

  for (const material of Object.values(resources.stickerMaterials)) {
    material.dispose();
  }
}

// Keep this helper beside the materials so future authored texture maps cannot
// accidentally enter the renderer in the wrong colour space.
export function markAlbedoTexture(texture: Texture): Texture {
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
