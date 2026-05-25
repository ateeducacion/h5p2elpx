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

  it("preserves H5P slide positioning as a single positioned-overlay iDevice per slide", async () => {
    const bytes = await makeH5pZip({
      title: "CP",
      mainLibrary: "H5P.CoursePresentation",
      extras: {
        "content/images/bg.jpg": new Uint8Array([0xff, 0xd8, 0xff]),
        "content/images/button.png": new Uint8Array([0x89, 0x50, 0x4e])
      },
      content: {
        presentation: {
          slides: [
            {
              elements: [
                // Background image (full slide)
                {
                  x: 0,
                  y: 0,
                  width: 100,
                  height: 100,
                  action: {
                    library: "H5P.Image 1.1",
                    params: { file: { path: "images/bg.jpg", mime: "image/jpeg" } }
                  }
                },
                // Button background image
                {
                  x: 44.6,
                  y: 25.7,
                  width: 18.3,
                  height: 18.9,
                  action: {
                    library: "H5P.Image 1.1",
                    params: { file: { path: "images/button.png", mime: "image/png" } }
                  }
                },
                // Button label
                {
                  x: 46.8,
                  y: 32.3,
                  width: 14,
                  height: 6,
                  action: {
                    library: "H5P.AdvancedText 1.1",
                    params: { text: "<p><strong>¿Qué es el agua?</strong></p>" }
                  }
                },
                // Invisible navigation hotspot
                { x: 44.6, y: 30.1, width: 18.3, height: 8.2, goToSlide: 2, invisible: true }
              ]
            }
          ]
        }
      }
    });
    const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "cp.h5p" }], {
      layout: "preserve"
    });
    expect(result.report.activities[0]!.mappedTo).toContain("course-presentation");

    // Find the slide page and its single iDevice.
    const slidePage = result.project.pages.find((p) => p.title === "Slide 1")!;
    expect(slidePage).toBeDefined();
    const ides = slidePage.blocks.flatMap((b) => b.iDevices);
    expect(ides).toHaveLength(1);
    const html = ides[0]!.htmlView;
    // One container per slide
    expect(html).toContain("cp-slide");
    // Background image kept (asset path rewritten to {{context_path}})
    expect(html).toMatch(/\{\{context_path\}\}\/bg\.jpg/);
    expect(html).toMatch(/\{\{context_path\}\}\/button\.png/);
    // Percent-based positioning preserved
    expect(html).toContain("left:46.8%");
    expect(html).toContain("top:32.3%");
    // Button label survives
    expect(html).toContain("¿Qué es el agua?");
    // GoToSlide hotspot rendered as overlay div
    expect(html).toMatch(/title="Go to slide 2"/);
  });
});
