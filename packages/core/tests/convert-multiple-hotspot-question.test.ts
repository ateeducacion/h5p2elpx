import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { convert } from "../src/convert/convert.ts";
import { makeH5pZip } from "./_helpers.ts";

describe("convert H5P.MultipleHotspotQuestion", () => {
  it("renders an image + ordered hotspot list as a text iDevice", async () => {
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

    const zip = await JSZip.loadAsync(result.elpx);
    const xml = await zip.file("content.xml")!.async("string");
    expect(xml).toContain("<odeIdeviceTypeName>text</odeIdeviceTypeName>");
    expect(xml).toContain("h5p2elpx-hotspots");
    expect(xml).toContain("Click every cat");
    expect(xml).toContain("Hotspot 1");
    expect(xml).toContain("correct");
    expect(xml).toContain("Yes, that's a cat!");
  });
});
