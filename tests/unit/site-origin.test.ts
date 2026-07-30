import { describe, expect, it } from "vitest";

import { resolveSiteOrigin } from "@/lib/site-origin";

describe("resolveSiteOrigin", () => {
  it("normalizes a configured HTTP or HTTPS URL to its origin", () => {
    expect(
      resolveSiteOrigin({
        NEXT_PUBLIC_SITE_URL: "https://cubo.example/landing?campaign=launch",
      }).toString(),
    ).toBe("https://cubo.example/");
    expect(
      resolveSiteOrigin({
        NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:4173/demo",
      }).toString(),
    ).toBe("http://127.0.0.1:4173/");
  });

  it("uses localhost only when a local build has no configured URL", () => {
    expect(resolveSiteOrigin({}).toString()).toBe("http://localhost:3000/");
    expect(
      resolveSiteOrigin({
        NEXT_PUBLIC_SITE_URL: "   ",
      }).toString(),
    ).toBe("http://localhost:3000/");
  });

  it("rejects an explicitly invalid, unsafe or credentialed URL in every environment", () => {
    expect(
      () =>
        resolveSiteOrigin({
          NEXT_PUBLIC_SITE_URL: "javascript:alert(1)",
        }),
    ).toThrow(
      "NEXT_PUBLIC_SITE_URL must be an absolute HTTP(S) URL without credentials",
    );
    expect(() =>
      resolveSiteOrigin({
        NEXT_PUBLIC_SITE_URL: "not a URL",
      }),
    ).toThrow(
      "NEXT_PUBLIC_SITE_URL must be an absolute HTTP(S) URL without credentials",
    );
    expect(() =>
      resolveSiteOrigin({
        NEXT_PUBLIC_SITE_URL: "https://buyer:secret@cubo.example/catalog",
      }),
    ).toThrow(
      "NEXT_PUBLIC_SITE_URL must be an absolute HTTP(S) URL without credentials",
    );
    expect(() =>
      resolveSiteOrigin({
        NEXT_PUBLIC_SITE_URL: "javascript:alert(1)",
        VERCEL: "1",
      }),
    ).toThrow(
      "NEXT_PUBLIC_SITE_URL must be an absolute HTTP(S) URL without credentials",
    );
  });

  it("uses Vercel's production project domain without manual configuration", () => {
    expect(
      resolveSiteOrigin({
        VERCEL: "1",
        VERCEL_PROJECT_PRODUCTION_URL: "cubo-3d.vercel.app",
      }).toString(),
    ).toBe("https://cubo-3d.vercel.app/");
  });

  it("falls back to the generated deployment domain on Vercel", () => {
    expect(
      resolveSiteOrigin({
        VERCEL: "1",
        VERCEL_URL: "cubo-3d-git-main-bryan-dev074.vercel.app",
      }).toString(),
    ).toBe("https://cubo-3d-git-main-bryan-dev074.vercel.app/");
  });

  it("prefers an explicit site URL, then the production domain, then the deployment domain", () => {
    expect(
      resolveSiteOrigin({
        NEXT_PUBLIC_SITE_URL: "https://cubo.example/store",
        VERCEL: "1",
        VERCEL_PROJECT_PRODUCTION_URL: "cubo-3d.vercel.app",
        VERCEL_URL: "cubo-3d-preview.vercel.app",
      }).toString(),
    ).toBe("https://cubo.example/");

    expect(
      resolveSiteOrigin({
        VERCEL: "1",
        VERCEL_PROJECT_PRODUCTION_URL: "cubo-3d.vercel.app",
        VERCEL_URL: "cubo-3d-preview.vercel.app",
      }).toString(),
    ).toBe("https://cubo-3d.vercel.app/");
  });

  it("fails a Vercel build instead of publishing localhost metadata when no system URL is exposed", () => {
    expect(() => resolveSiteOrigin({ VERCEL: "1" })).toThrow(
      "Vercel must expose a valid non-loopback production or deployment domain",
    );
    expect(() =>
      resolveSiteOrigin({
        NEXT_PUBLIC_SITE_URL: "ftp://cubo.example",
        VERCEL: "1",
      }),
    ).toThrow(
      "NEXT_PUBLIC_SITE_URL must be an absolute HTTP(S) URL without credentials",
    );
  });

  it.each([
    "http://localhost:3000",
    "https://preview.localhost",
    "http://127.0.0.1:3000",
    "http://127.42.8.9",
    "http://[::1]:3000",
  ])("rejects loopback metadata on Vercel: %s", (configuredUrl) => {
    expect(() =>
      resolveSiteOrigin({
        NEXT_PUBLIC_SITE_URL: configuredUrl,
        VERCEL: "1",
      }),
    ).toThrow(
      "Vercel must expose a valid non-loopback production or deployment domain",
    );
  });

  it.each([
    "localhost:3000",
    "preview.localhost",
    "127.0.0.1:3000",
    "[::1]:3000",
    "buyer:secret@cubo.example",
    "javascript:alert(1)",
    "cubo.example:8443",
    "//cubo.example",
  ])("rejects an unsafe Vercel system domain: %s", (systemDomain) => {
    expect(() =>
      resolveSiteOrigin({
        VERCEL: "1",
        VERCEL_PROJECT_PRODUCTION_URL: systemDomain,
      }),
    ).toThrow(
      "Vercel must expose a valid non-loopback production or deployment domain",
    );
  });
});
