import { describe, it, expect } from "vitest";
import { convert } from "../src/convert/convert.ts";
import { makeH5pZip } from "./_helpers.ts";

const PNG_1PX = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82
]);

describe("H5P.ImageSequencing accepts the real `sequenceImages` field", () => {
  it("renders one <img> per sequence entry with the rewritten asset URL", async () => {
    const bytes = await makeH5pZip({
      mainLibrary: "H5P.ImageSequencing",
      content: {
        taskDescription: "Order the water cycle.",
        sequenceImages: [
          { image: { path: "images/a.png" }, imageDescription: "Evaporation" },
          { image: { path: "images/b.png" }, imageDescription: "Condensation" },
          { image: { path: "images/c.png" }, imageDescription: "Precipitation" }
        ]
      },
      extras: {
        "content/images/a.png": PNG_1PX,
        "content/images/b.png": PNG_1PX,
        "content/images/c.png": PNG_1PX
      }
    });
    const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "is.h5p" }]);
    const flat = result.project.pages.flatMap((p) => p.blocks.flatMap((b) => b.iDevices));
    const text = flat.find((i) => i.typeName === "text")!;
    const html = text.htmlView;
    expect(html).toContain('<img src="{{context_path}}/a.png"');
    expect(html).toContain('<img src="{{context_path}}/b.png"');
    expect(html).toContain('<img src="{{context_path}}/c.png"');
    expect(html).toContain("Evaporation");
    // Asset is flattened into content/resources/.
    expect(
      result.project.resources.find((r) => r.path === "content/resources/a.png")
    ).toBeDefined();
  });
});

describe("H5P.Link adapter", () => {
  it("renders an <a href> in a text iDevice and reports no unsupported items", async () => {
    const bytes = await makeH5pZip({
      mainLibrary: "H5P.Link",
      content: {
        title: "Open agua.org.mx",
        linkWidget: { protocol: "https://", url: "agua.org.mx/que-es/" }
      }
    });
    const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "link.h5p" }]);
    expect(result.report.summary.unsupported).toBe(0);
    const flat = result.project.pages.flatMap((p) => p.blocks.flatMap((b) => b.iDevices));
    const text = flat.find((i) => i.typeName === "text")!;
    expect(text.htmlView).toContain('href="https://agua.org.mx/que-es/"');
    expect(text.htmlView).toContain("Open agua.org.mx");
  });
});

describe("H5P.DocumentationTool adapter", () => {
  it("produces one eXe page per StandardPage with the chapter title preserved", async () => {
    const bytes = await makeH5pZip({
      mainLibrary: "H5P.DocumentationTool",
      content: {
        taskDescription: "El Gato Con Botas",
        pagesList: [
          {
            library: "H5P.StandardPage 1.5",
            metadata: { title: "INICIO" },
            params: {
              elementList: [
                {
                  library: "H5P.Image 1.1",
                  params: {
                    contentName: "Image",
                    file: { path: "images/p1.png", mime: "image/png", width: 1, height: 1 }
                  }
                },
                {
                  library: "H5P.Text 1.1",
                  params: { text: "<p>Había una vez un molinero pobre…</p>" }
                }
              ]
            }
          },
          {
            library: "H5P.StandardPage 1.5",
            metadata: { title: "FIN" },
            params: {
              elementList: [
                { library: "H5P.Text 1.1", params: { text: "<p>Colorín, colorado…</p>" } }
              ]
            }
          }
        ]
      },
      extras: { "content/images/p1.png": PNG_1PX }
    });
    const result = await convert([
      { kind: "h5p-bytes", data: bytes, filename: "dt.h5p" }
      // preserve layout is the default — DocumentationTool returns container of pages
    ]);
    expect(result.report.summary.unsupported).toBe(0);
    // 1 root page + 2 chapter pages.
    expect(result.project.pages.length).toBeGreaterThanOrEqual(3);
    const pageTitles = result.project.pages.map((p) => p.title);
    expect(pageTitles).toContain("INICIO");
    expect(pageTitles).toContain("FIN");
  });
});

describe("H5P.InteractiveVideo handles TrueFalse interactions", () => {
  it("encodes TrueFalse interactions as singleChoice slides with True/False answers", async () => {
    const bytes = await makeH5pZip({
      mainLibrary: "H5P.InteractiveVideo",
      content: {
        interactiveVideo: {
          video: {
            files: [{ path: "https://www.youtube.com/watch?v=abc", mime: "video/YouTube" }]
          },
          assets: {
            interactions: [
              {
                duration: { from: 12, to: 20 },
                action: {
                  library: "H5P.TrueFalse 1.8",
                  params: { question: "<p>Is the cat real?</p>", correct: "true" }
                }
              },
              {
                duration: { from: 45, to: 55 },
                action: {
                  library: "H5P.TrueFalse 1.8",
                  params: { question: "<p>Did the ogre eat the cat?</p>", correct: "false" }
                }
              }
            ]
          }
        }
      }
    });
    const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "iv.h5p" }]);
    const flat = result.project.pages.flatMap((p) => p.blocks.flatMap((b) => b.iDevices));
    const iv = flat.find((i) => i.typeName === "interactive-video")!;
    const json = iv.htmlView.match(
      /<div id="exe-interactive-video-contents"[^>]*>([\s\S]*?)<\/div>/
    )![1]!;
    const data = JSON.parse(json);
    expect(data.slides).toHaveLength(2);
    expect(data.slides[0].type).toBe("singleChoice");
    expect(data.slides[0].startTime).toBe(12);
    expect(data.slides[0].answers).toEqual([
      ["True", 1],
      ["False", 0]
    ]);
    expect(data.slides[1].answers).toEqual([
      ["True", 0],
      ["False", 1]
    ]);
  });
});
