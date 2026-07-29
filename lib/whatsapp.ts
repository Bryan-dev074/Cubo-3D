import { dictionaries } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";

const whatsappBaseUrl = "https://wa.me/595982064334";

export function buildWhatsAppUrl(locale: Locale): string {
  return `${whatsappBaseUrl}?text=${encodeURIComponent(
    dictionaries[locale].whatsappMessage,
  )}`;
}
