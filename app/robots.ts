import type { MetadataRoute } from "next";

import { resolveSiteOrigin } from "@/lib/site-origin";

export default function robots(): MetadataRoute.Robots {
  const origin = resolveSiteOrigin();

  return {
    host: origin.origin,
    rules: {
      allow: "/",
      userAgent: "*",
    },
    sitemap: new URL("/sitemap.xml", origin).toString(),
  };
}
