import { describe, expect, it } from "vitest";

import { dictionaries } from "@/lib/i18n/dictionaries";
import { detectLocale } from "@/lib/i18n/locale";

describe("bilingual dictionaries", () => {
  it("keeps the Portuguese dictionary structurally identical to Spanish", () => {
    expect(Object.keys(dictionaries.pt)).toEqual(Object.keys(dictionaries.es));
  });
});

describe("detectLocale", () => {
  it("uses a persisted Spanish choice before browser preferences", () => {
    expect(detectLocale("es", ["pt-BR", "en-US"])).toBe("es");
  });

  it("uses a persisted Portuguese choice before browser preferences", () => {
    expect(detectLocale("pt", ["es-PY", "en-US"])).toBe("pt");
  });

  it("uses Portuguese when no stored choice exists and a browser language starts with pt", () => {
    expect(detectLocale(null, ["en-US", "pt-BR"])).toBe("pt");
  });

  it("falls back to Spanish for unknown stored values and non-Portuguese browsers", () => {
    expect(detectLocale("fr", ["en-US", "es-PY"])).toBe("es");
  });
});
