const LOCAL_SITE_ORIGIN = new URL("http://localhost:3000");
const SITE_ORIGIN_ERROR =
  "NEXT_PUBLIC_SITE_URL must be an absolute HTTP(S) URL without credentials";
const VERCEL_SITE_ORIGIN_ERROR =
  "Vercel must expose a valid non-loopback production or deployment domain";

export interface SiteEnvironment {
  readonly NEXT_PUBLIC_SITE_URL?: string;
  readonly VERCEL?: string;
  readonly VERCEL_PROJECT_PRODUCTION_URL?: string;
  readonly VERCEL_URL?: string;
}

export function resolveSiteOrigin(
  environment: SiteEnvironment = process.env as SiteEnvironment,
): URL {
  const rawValue = environment.NEXT_PUBLIC_SITE_URL;
  if (rawValue?.trim()) {
    const configured = parseHttpOrigin(rawValue);
    if (
      environment.VERCEL === "1" &&
      isLoopbackHostname(configured.hostname)
    ) {
      throw new Error(VERCEL_SITE_ORIGIN_ERROR);
    }
    return configured;
  }

  if (environment.VERCEL === "1") {
    const systemDomain =
      environment.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
      environment.VERCEL_URL?.trim();

    if (!systemDomain) {
      throw new Error(VERCEL_SITE_ORIGIN_ERROR);
    }

    return parseVercelDomain(systemDomain);
  }

  return new URL(LOCAL_SITE_ORIGIN);
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

function parseVercelDomain(value: string): URL {
  const domain = value.trim();
  const containsNonHostnameSyntax = ["/", "\\", "@", "?", "#", ":"].some(
    (character) => domain.includes(character),
  );

  if (!domain || containsNonHostnameSyntax) {
    throw new Error(VERCEL_SITE_ORIGIN_ERROR);
  }

  let parsed: URL;
  try {
    parsed = new URL(`https://${domain}`);
  } catch {
    throw new Error(VERCEL_SITE_ORIGIN_ERROR);
  }

  if (
    !parsed.hostname ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    isLoopbackHostname(parsed.hostname)
  ) {
    throw new Error(VERCEL_SITE_ORIGIN_ERROR);
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
