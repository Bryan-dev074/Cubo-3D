import type { MetadataRoute } from "next";

import { resolveSiteOrigin } from "@/lib/site-origin";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = resolveSiteOrigin();

  return [
    {
      changeFrequency: "weekly",
      priority: 1,
      url: new URL("/", origin).toString(),
    },
  ];
}
