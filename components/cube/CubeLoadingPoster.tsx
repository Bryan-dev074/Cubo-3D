import Image from "next/image";

interface CubeLoadingPosterProps {
  readonly eager?: boolean;
}

export function CubeLoadingPoster({ eager = false }: CubeLoadingPosterProps) {
  return (
    <div className="cube-poster" data-testid="cube-loading-poster">
      <Image
        fill
        alt="Vista previa del Cubo Mágico 3D"
        priority={eager}
        sizes="(max-width: 720px) 100vw, 78rem"
        src="/cube-poster.svg"
        unoptimized
      />
    </div>
  );
}
