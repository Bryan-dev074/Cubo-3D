import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("production metadata routes", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("publishes crawl instructions with the resolved sitemap and host", () => {
    expect(robots()).toEqual({
      host: "http://localhost:3000",
      rules: {
        allow: "/",
        userAgent: "*",
      },
      sitemap: "http://localhost:3000/sitemap.xml",
    });
  });

  it("publishes the single canonical product page without a fabricated date", () => {
    expect(sitemap()).toEqual([
      {
        changeFrequency: "weekly",
        priority: 1,
        url: "http://localhost:3000/",
      },
    ]);
  });
});
