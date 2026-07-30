import { describe, expect, it } from "vitest";

import {
  createCubeRenderResources,
  disposeCubeRenderResources,
} from "@/components/cube/cube-materials";

describe("cube physical materials", () => {
  it("shares subtle independent procedural roughness and bump maps", () => {
    const resources = createCubeRenderResources();

    try {
      expect(resources.microRoughnessTexture).toBeDefined();
      expect(resources.microBumpTexture).toBeDefined();
      expect(resources.microRoughnessTexture).not.toBe(
        resources.microBumpTexture,
      );
      expect(resources.bodyMaterial.roughness).toBeGreaterThanOrEqual(0.58);
      expect(resources.bodyMaterial.clearcoat).toBeLessThanOrEqual(0.03);
      expect(resources.bodyMaterial.roughnessMap).toBe(
        resources.microRoughnessTexture,
      );
      expect(resources.bodyMaterial.bumpMap).toBe(resources.microBumpTexture);
      expect(resources.bodyMaterial.bumpScale).toBeGreaterThan(0);
      expect(resources.bodyMaterial.bumpScale).toBeLessThanOrEqual(0.03);

      for (const material of Object.values(resources.stickerMaterials)) {
        expect(material.roughness).toBeGreaterThanOrEqual(0.6);
        expect(material.clearcoat).toBeLessThanOrEqual(0.03);
        expect(material.roughnessMap).toBe(resources.microRoughnessTexture);
        expect(material.bumpMap).toBe(resources.microBumpTexture);
        expect(material.bumpScale).toBeGreaterThan(0);
        expect(material.bumpScale).toBeLessThanOrEqual(0.04);
      }
    } finally {
      disposeCubeRenderResources(resources);
    }
  });
});
