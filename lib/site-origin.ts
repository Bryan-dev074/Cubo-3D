const LOCAL_SITE_ORIGIN = new URL("http://localhost:3000");
const SITE_ORIGIN_ERROR =
  "NEXT_PUBLIC_SITE_URL must be an absolute HTTP(S) URL without credentials";
const VERCEL_SITE_ORIGIN_ERROR =
  "NEXT_PUBLIC_SITE_URL must be a non-loopback absolute HTTP(S) URL without credentials for Vercel builds";

export interface SiteEnvironment {
  readonly NEXT_PUBLIC_SITE_URL?: string;
  readonly VERCEL?: string;
}

export function resolveSiteOrigin(
  environment: SiteEnvironment = process.env as SiteEnvironment,
): URL {
  const rawValue = environment.NEXT_PUBLIC_SITE_URL;
  if (!rawValue?.trim()) {
    if (environment.VERCEL === "1") {
      throw new Error(VERCEL_SITE_ORIGIN_ERROR);
    }
    return new URL(LOCAL_SITE_ORIGIN);
  }

  const configured = parseHttpOrigin(rawValue);
  if (
    environment.VERCEL === "1" &&
    isLoopbackHostname(configured.hostname)
  ) {
    throw new Error(VERCEL_SITE_ORIGIN_ERROR);
  }
  return configured;
}

function parseHttpOrigin(value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error(SITE_ORIGIN_ERROR);
  }

  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error(SITE_ORIGIN_ERROR);
  }

  return new URL(parsed.origin);
}

function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.startsWith("127.") ||
    hostname === "[::1]"
  );
}
