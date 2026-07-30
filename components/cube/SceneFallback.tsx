"use client";

import { CubeLoadingPoster } from "@/components/cube/CubeLoadingPoster";
import { dictionaries } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";

interface SceneFallbackProps {
  readonly locale?: Locale;
  readonly purchaseHref: string;
  readonly reason: "webgl" | "error";
  readonly onRetry?: () => void;
}

export function SceneFallback({
  locale = "es",
  onRetry,
  purchaseHref,
  reason,
}: SceneFallbackProps) {
  const dictionary = dictionaries[locale];
  const title =
    reason === "webgl"
      ? dictionary.sceneWebglTitle
      : dictionary.sceneErrorTitle;
  const body =
    reason === "webgl"
      ? dictionary.sceneWebglBody
      : dictionary.sceneErrorBody;

  return (
    <section className="scene-fallback">
      <CubeLoadingPoster eager locale={locale} />
      <div className="scene-fallback__copy">
        <h2>{title}</h2>
        <p>{body}</p>
        <div className="scene-fallback__actions">
          {onRetry ? (
            <button type="button" onClick={onRetry}>
              {dictionary.sceneRetry}
            </button>
          ) : null}
          <a href={purchaseHref} rel="noreferrer" target="_blank">
            {dictionary.scenePurchase}
          </a>
        </div>
      </div>
    </section>
  );
}
