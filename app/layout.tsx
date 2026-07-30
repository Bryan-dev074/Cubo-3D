import type { Metadata, Viewport } from "next";
import { Archivo, Archivo_Black } from "next/font/google";

import { resolveSiteOrigin } from "@/lib/site-origin";

import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
});

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-archivo-black",
});

export const metadata: Metadata = {
  metadataBase: resolveSiteOrigin(),
  title: {
    default: "Cubo Mágico 3D",
    template: "%s | Cubo Mágico 3D",
  },
  description:
    "Desordena, gira y resuelve un cubo mágico 3D interactivo. Compra el cubo físico por WhatsApp.",
  applicationName: "Cubo Mágico 3D",
  alternates: {
    canonical: "/",
  },
  keywords: [
    "cubo mágico 3D",
    "cubo 3x3",
    "cubo interactivo",
    "comprar cubo mágico",
  ],
  openGraph: {
    type: "website",
    url: "/",
    title: "Cubo Mágico 3D",
    description:
      "Desordena, gira y resuelve el cubo en 3D antes de llevar el desafío a tus manos.",
    siteName: "Cubo Mágico 3D",
    locale: "es_PY",
    alternateLocale: ["pt_BR"],
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Cubo Mágico 3D interactivo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cubo Mágico 3D",
    description:
      "Desordena, gira y resuelve el cubo en 3D antes de llevar el desafío a tus manos.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
  category: "shopping",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    {
      color: "#f2f5f6",
      media: "(prefers-color-scheme: light)",
    },
    {
      color: "#1b2125",
      media: "(prefers-color-scheme: dark)",
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${archivo.variable} ${archivoBlack.variable}`}>
      <body>{children}</body>
    </html>
  );
}
