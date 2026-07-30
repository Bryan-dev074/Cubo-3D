import {
  Color,
  MeshPhysicalMaterial,
  SRGBColorSpace,
  Texture,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export const CUBIE_SPACING = 1;
export const BODY_SIZE = 0.95;
export const STICKER_OFFSET = 0.482;

export type StickerColor = "blue" | "green" | "orange" | "red" | "white" | "yellow";

export interface CubeRenderResources {
  readonly bodyGeometry: RoundedBoxGeometry;
  readonly stickerGeometry: RoundedBoxGeometry;
  readonly bodyMaterial: MeshPhysicalMaterial;
  readonly stickerMaterials: Readonly<Record<StickerColor, MeshPhysicalMaterial>>;
}

const STICKER_COLORS: Readonly<Record<StickerColor, number>> = Object.freeze({
  blue: 0x1557b8,
  green: 0x347b47,
  orange: 0xe87922,
  red: 0xd83d32,
  white: 0xeaebe8,
  yellow: 0xe9ba18,
});

export function createCubeRenderResources(): CubeRenderResources {
  const bodyGeometry = new RoundedBoxGeometry(BODY_SIZE, BODY_SIZE, BODY_SIZE, 5, 0.105);
  bodyGeometry.name = "shared-rounded-cubie-body";

  const stickerGeometry = new RoundedBoxGeometry(0.75, 0.75, 0.034, 5, 0.068);
  stickerGeometry.name = "shared-rounded-sticker";

  const bodyMaterial = new MeshPhysicalMaterial({
    name: "shared-graphite-satin-plastic",
    color: new Color(0x15191b),
    metalness: 0,
    roughness: 0.48,
    clearcoat: 0.06,
    clearcoatRoughness: 0.72,
    envMapIntensity: 0.46,
  });

  const stickerMaterials = Object.fromEntries(
    Object.entries(STICKER_COLORS).map(([name, color]) => [
      name,
      new MeshPhysicalMaterial({
        name: `shared-${name}-sticker-satin`,
        color: new Color(color),
        metalness: 0,
        roughness: 0.52,
        clearcoat: 0.08,
        clearcoatRoughness: 0.66,
        envMapIntensity: 0.5,
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
