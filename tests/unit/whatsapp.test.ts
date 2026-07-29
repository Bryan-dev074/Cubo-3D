import { describe, expect, it } from "vitest";

import { buildWhatsAppUrl } from "@/lib/whatsapp";

describe("buildWhatsAppUrl", () => {
  it("returns the exact encoded Spanish purchase URL", () => {
    expect(buildWhatsAppUrl("es")).toBe(
      "https://wa.me/595982064334?text=Hola%20%F0%9F%91%8B%20Quiero%20comprar%20el%20Cubo%20M%C3%A1gico%203D%20%F0%9F%A7%A9%20%C2%BFPodr%C3%ADan%20confirmarme%20el%20precio%2C%20la%20disponibilidad%20y%20las%20opciones%20de%20entrega%3F",
    );
  });

  it("returns the exact encoded Portuguese purchase URL", () => {
    expect(buildWhatsAppUrl("pt")).toBe(
      "https://wa.me/595982064334?text=Ol%C3%A1%20%F0%9F%91%8B%20Quero%20comprar%20o%20Cubo%20M%C3%A1gico%203D%20%F0%9F%A7%A9%20Poderiam%20me%20confirmar%20o%20pre%C3%A7o%2C%20a%20disponibilidade%20e%20as%20op%C3%A7%C3%B5es%20de%20entrega%3F",
    );
  });
});
