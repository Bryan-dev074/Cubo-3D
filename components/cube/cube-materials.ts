import {
  Color,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshPhysicalMaterial,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  Texture,
  UnsignedByteType,
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
  readonly microBumpTexture: DataTexture;
  readonly microRoughnessTexture: DataTexture;
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

  const microRoughnessTexture = createMicroTexture(
    "shared-cube-micro-roughness",
    225,
    28,
    0x4d2,
  );
  const microBumpTexture = createMicroTexture(
    "shared-cube-micro-bump",
    128,
    32,
    0x8b7,
  );

  const bodyMaterial = new MeshPhysicalMaterial({
    name: "shared-graphite-satin-plastic",
    color: new Color(0x1b2022),
    metalness: 0,
    roughness: 0.66,
    roughnessMap: microRoughnessTexture,
    bumpMap: microBumpTexture,
    bumpScale: 0.025,
    clearcoat: 0.01,
    clearcoatRoughness: 0.86,
    envMapIntensity: 0.34,
    specularIntensity: 0.5,
  });

  const stickerMaterials = Object.fromEntries(
    Object.entries(STICKER_COLORS).map(([name, color]) => [
      name,
      new MeshPhysicalMaterial({
        name: `shared-${name}-sticker-satin`,
        color: new Color(color),
        metalness: 0,
        roughness: 0.7,
        roughnessMap: microRoughnessTexture,
        bumpMap: microBumpTexture,
        bumpScale: 0.035,
        clearcoat: 0.01,
        clearcoatRoughness: 0.88,
        envMapIntensity: 0.36,
        specularIntensity: 0.5,
      }),
    ]),
  ) as Record<StickerColor, MeshPhysicalMaterial>;

  return {
    bodyGeometry,
    stickerGeometry,
    bodyMaterial,
    microBumpTexture,
    microRoughnessTexture,
    stickerMaterials: Object.freeze(stickerMaterials),
  };
}

export function disposeCubeRenderResources(resources: CubeRenderResources): void {
  resources.bodyGeometry.dispose();
  resources.stickerGeometry.dispose();
  resources.bodyMaterial.dispose();
  resources.microBumpTexture.dispose();
  resources.microRoughnessTexture.dispose();

  for (const material of Object.values(resources.stickerMaterials)) {
    material.dispose();
  }
}

function createMicroTexture(
  name: string,
  midpoint: number,
  amplitude: number,
  seed: number,
): DataTexture {
  const size = 48;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const first = deterministicNoise(x, y, seed);
      const second = deterministicNoise(
        Math.floor(x / 3),
        Math.floor(y / 3),
        seed ^ 0x9e37,
      );
      const variation = (first * 0.62 + second * 0.38) * 2 - 1;
      const value = Math.round(
        Math.min(255, Math.max(0, midpoint + variation * amplitude)),
      );
      const offset = (y * size + x) * 4;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }

  const texture = new DataTexture(
    data,
    size,
    size,
    RGBAFormat,
    UnsignedByteType,
  );
  texture.name = name;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(1.5, 1.5);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function deterministicNoise(x: number, y: number, seed: number): number {
  let value = Math.imul(x + 1, 0x45d9f3b);
  value ^= Math.imul(y + 1, 0x119de1f3);
  value ^= seed;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 0xffff_ffff;
}

// Keep this helper beside the materials so future authored texture maps cannot
// accidentally enter the renderer in the wrong colour space.
export function markAlbedoTexture(texture: Texture): Texture {
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
