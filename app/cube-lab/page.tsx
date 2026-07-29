import type { Metadata } from "next";

import { CubeLab } from "@/components/cube/CubeLab";

export const metadata: Metadata = {
  title: "Laboratorio del cubo 3D",
  robots: {
    follow: false,
    index: false,
  },
};

export default function CubeLabPage() {
  return <CubeLab />;
}
