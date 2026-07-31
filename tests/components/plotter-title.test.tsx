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
    expect(screen.getAllByTestId("plotter-register")).toHaveLength(1);
    expect(screen.getByTestId("plotter-register")).toHaveAttribute(
      "aria-hidden",
      "true",
    );

    const glyphs = screen.getAllByTestId("plotter-glyph");
    expect(glyphs[0]).toHaveAttribute("data-write-start", "0");
    expect(glyphs[0]).toHaveAttribute("data-write-end", "160");
    expect(glyphs[0]).toHaveAttribute("data-erase-start", "10136");
    expect(glyphs[0]).toHaveAttribute("data-erase-end", "10160");
    expect(glyphs.at(-1)).toHaveAttribute("data-write-start", "600");
    expect(glyphs.at(-1)).toHaveAttribute("data-write-end", "760");
    expect(glyphs.at(-1)).toHaveAttribute("data-erase-start", "9800");
    expect(glyphs.at(-1)).toHaveAttribute("data-erase-end", "9824");

    for (const [index, glyph] of glyphs.entries()) {
      expect(glyph).toHaveAttribute("data-glyph-index", String(index));
      expect(glyph.style.getPropertyValue("--glyph-timing")).toMatch(
        /^linear\(/,
      );
    }
  });
});
