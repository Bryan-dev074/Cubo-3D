"use client";

import { CubeLoadingPoster } from "@/components/cube/CubeLoadingPoster";

interface SceneFallbackProps {
  readonly purchaseHref: string;
  readonly reason: "webgl" | "error";
  readonly onRetry?: () => void;
}

const COPY = {
  webgl: {
    title: "Tu navegador no puede mostrar el cubo 3D",
    body: "Puedes ver una vista previa y comprar el cubo igualmente.",
  },
  error: {
    title: "No pudimos cargar el cubo 3D",
    body: "La vista 3D tuvo un problema. Puedes reintentar o comprar el cubo igualmente.",
  },
} as const;

export function SceneFallback({ onRetry, purchaseHref, reason }: SceneFallbackProps) {
  const copy = COPY[reason];

  return (
    <section className="scene-fallback" aria-live={reason === "error" ? "polite" : "off"}>
      <CubeLoadingPoster eager />
      <div className="scene-fallback__copy">
        <h2>{copy.title}</h2>
        <p>{copy.body}</p>
        <div className="scene-fallback__actions">
          {onRetry ? (
            <button type="button" onClick={onRetry}>
              Reintentar escena 3D
            </button>
          ) : null}
          <a href={purchaseHref} rel="noreferrer" target="_blank">
            Comprar por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
