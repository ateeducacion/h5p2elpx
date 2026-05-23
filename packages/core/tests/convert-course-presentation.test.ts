import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { convert } from "../src/convert/convert.ts";
import { makeH5pZip } from "./_helpers.ts";

describe("convert H5P.CoursePresentation", () => {
  it("emits one page per slide under preserve layout", async () => {
    const bytes = await makeH5pZip({
      title: "CP",
      mainLibrary: "H5P.CoursePresentation",
      content: {
        presentation: {
          slides: [
            {
              elements: [
                { action: { library: "H5P.Text 1.1", params: { text: "<p>Slide 1</p>" } } }
              ]
            },
            {
              elements: [
                { action: { library: "H5P.Text 1.1", params: { text: "<p>Slide 2</p>" } } }
              ]
            }
          ]
        }
      }
    });
    const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "cp.h5p" }], {
      layout: "preserve"
    });
    // root page + 2 slide pages
    expect(result.project.pages.length).toBeGreaterThanOrEqual(3);
    const slideTitles = result.project.pages.map((p) => p.title);
    expect(slideTitles).toContain("Slide 1");
    expect(slideTitles).toContain("Slide 2");

    const zip = await JSZip.loadAsync(result.elpx);
    expect(zip.file("index.html")).not.toBeNull();
    expect(zip.file("html/slide-1.html")).not.toBeNull();
    expect(zip.file("html/slide-2.html")).not.toBeNull();
  });
});
