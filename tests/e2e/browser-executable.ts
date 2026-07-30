import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { posix, win32 } from "node:path";

interface ChromeExecutableOptions {
  readonly bundledPath: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly exists?: (candidate: string) => boolean;
  readonly homeDirectory?: string;
  readonly platform?: NodeJS.Platform;
}

export function resolveChromeExecutablePath({
  bundledPath,
  env = process.env,
  exists = existsSync,
  homeDirectory = homedir(),
  platform = process.platform,
}: ChromeExecutableOptions): string | undefined {
  const explicitPath = environmentValue(env, "PLAYWRIGHT_EXECUTABLE_PATH");
  if (explicitPath) {
    if (!exists(explicitPath)) {
      throw new Error(
        `PLAYWRIGHT_EXECUTABLE_PATH does not exist: ${explicitPath}`,
      );
    }
    return explicitPath;
  }

  if (exists(bundledPath)) {
    return undefined;
  }

  const installed = installedChromeCandidates(
    platform,
    env,
    homeDirectory,
  ).find(exists);
  if (installed) {
    return installed;
  }

  throw new Error(
    "No Playwright Chromium or installed Chrome/Chromium executable was found. Install Chromium with Playwright or set PLAYWRIGHT_EXECUTABLE_PATH.",
  );
}

function installedChromeCandidates(
  platform: NodeJS.Platform,
  env: Readonly<Record<string, string | undefined>>,
  homeDirectory: string,
): readonly string[] {
  if (platform === "win32") {
    return compact([
      environmentValue(env, "ProgramFiles")
        ? win32.join(
            environmentValue(env, "ProgramFiles")!,
            "Google",
            "Chrome",
            "Application",
            "chrome.exe",
          )
        : undefined,
      environmentValue(env, "ProgramFiles(x86)")
        ? win32.join(
            environmentValue(env, "ProgramFiles(x86)")!,
            "Google",
            "Chrome",
            "Application",
            "chrome.exe",
          )
        : undefined,
      environmentValue(env, "LocalAppData")
        ? win32.join(
            environmentValue(env, "LocalAppData")!,
            "Google",
            "Chrome",
            "Application",
            "chrome.exe",
          )
        : undefined,
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ]);
  }

  if (platform === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      posix.join(
        homeDirectory,
        "Applications",
        "Google Chrome.app",
        "Contents",
        "MacOS",
        "Google Chrome",
      ),
    ];
  }

  return [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
}

function environmentValue(
  env: Readonly<Record<string, string | undefined>>,
  name: string,
): string | undefined {
  const key = Object.keys(env).find(
    (candidate) => candidate.toLowerCase() === name.toLowerCase(),
  );
  return key ? env[key]?.trim() || undefined : undefined;
}

function compact(values: readonly (string | undefined)[]): readonly string[] {
  return values.filter((value): value is string => Boolean(value));
}
