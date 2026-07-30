import Image from "next/image";

import { dictionaries } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";

interface CubeLoadingPosterProps {
  readonly eager?: boolean;
  readonly locale?: Locale;
}

export function CubeLoadingPoster({
  eager = false,
  locale = "es",
}: CubeLoadingPosterProps) {
  return (
    <div className="cube-poster" data-testid="cube-loading-poster">
      <Image
        fill
        alt={dictionaries[locale].scenePreviewAlt}
        priority={eager}
        sizes="(max-width: 720px) 100vw, 78rem"
        src="/cube-poster.svg"
        unoptimized
      />
    </div>
  );
}
