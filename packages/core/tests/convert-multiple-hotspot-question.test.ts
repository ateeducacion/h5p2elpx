import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { convert } from "../src/convert/convert.ts";
import { makeH5pZip } from "./_helpers.ts";

describe("convert H5P.MultipleHotspotQuestion", () => {
  it("renders hotspots as a map iDevice with rectangle markers and correct flags", async () => {
    const bytes = await makeH5pZip({
      title: "Click the cats",
      mainLibrary: "H5P.MultipleHotspotQuestion",
      content: {
        backgroundImageSettings: { path: "images/cats.jpg" },
        hotspotSettings: {
          taskDescription: "Click every cat",
          hotspot: [
            {
              shape: "rectangle",
              computedSettings: { x: 10.2, y: 20.5, width: 15, height: 12 },
              userSettings: { correct: true, feedbackText: "Yes, that's a cat!" }
            },
            {
              shape: "circle",
              computedSettings: { x: 50, y: 50, width: 8, height: 8 },
              userSettings: { correct: false, feedbackText: "Not a cat." }
            }
          ]
        }
      }
    });

    const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "mhs.h5p" }]);
    expect(result.report.summary.converted).toBe(1);
    expect(result.report.activities[0]!.mappedTo).toContain("map");

    const zip = await JSZip.loadAsync(result.elpx);
    const xml = await zip.file("content.xml")!.async("string");
    expect(xml).toContain("<odeIdeviceTypeName>map</odeIdeviceTypeName>");
    expect(xml).toContain("mapa-DataGame");

    // mapa-DataGame is plain JSON (no encryption); parse and inspect.
    const match = xml.match(/mapa-DataGame js-hidden">([^<]+)</);
    expect(match).not.toBeNull();
    const game = JSON.parse(match![1]!);
    expect(game.typeGame).toBe("Mapa");
    expect(game.version).toBe(3);
    expect(game.selectsGame).toMatchObject([
      { typeSelect: 0, numberOptions: 4, options: ["", "", "", ""] }
    ]);
    // forHtml rewriter is a passthrough here because the fixture has no
    // actual image bytes registered in the asset collector.
    expect(game.url).toContain("cats.jpg");
    expect(game.instructions).toBe("Click every cat");
    expect(game.points).toHaveLength(2);
    // Correct hotspot: rectangle coordinates normalized to eXe's 0..1 map space + correct=1.
    expect(game.points[0].x).toBeCloseTo(0.102);
    expect(game.points[0].x1).toBeCloseTo(0.252);
    expect(game.points[0].correct).toBe(1);
    expect(game.points[0].eText).toBe("Yes, that's a cat!");
    expect(game.points[1].correct).toBe(0);
  });
});
