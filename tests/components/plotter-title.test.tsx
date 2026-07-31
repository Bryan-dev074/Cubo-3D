import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PlotterTitle } from "@/components/experience/PlotterTitle";

describe("PlotterTitle", () => {
  it("exposes one accessible heading in two stable visual lines", () => {
    render(<PlotterTitle id="experience-title" title="Cubo Mágico 3D" />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { name: "Cubo Mágico 3D" }),
    ).toBeVisible();
    expect(screen.getByTestId("plotter-title")).toHaveAttribute(
      "aria-label",
      "Cubo Mágico 3D",
    );
    expect(screen.getAllByTestId("plotter-line")).toHaveLength(2);
    expect(screen.getAllByTestId("plotter-base")).toHaveLength(2);
    expect(screen.getAllByTestId("plotter-glyph")).toHaveLength(13);
  });
});
