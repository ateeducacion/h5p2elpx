import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { convert } from "../src/convert/convert.ts";
import { validateElpx } from "../src/exe/validate.ts";
import { makeH5pZip } from "./_helpers.ts";

describe("convert H5P.InteractiveVideo", () => {
  it("maps text and multichoice interactions to interactive-video slides", async () => {
    const bytes = await makeH5pZip({
      title: "IV",
      mainLibrary: "H5P.InteractiveVideo",
      content: {
        interactiveVideo: {
          video: {
            files: [{ path: "https://www.youtube.com/watch?v=abc123", mime: "video/YouTube" }]
          },
          assets: {
            interactions: [
              {
                duration: { from: 2.4, to: 4 },
                action: {
                  library: "H5P.AdvancedText 1.1",
                  params: { text: "<p>Watch carefully</p>" }
                }
              },
              {
                duration: { from: 5.1, to: 8 },
                action: {
                  library: "H5P.MultiChoice 1.16",
                  params: {
                    question: "<p>Pick one</p>",
                    answers: [
                      { text: "A", correct: false },
                      { text: "B", correct: true }
                    ]
                  }
                }
              }
            ]
          }
        }
      }
    });

    const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "iv.h5p" }]);
    expect(result.report.summary.converted).toBe(1);
    expect(result.report.activities[0]!.mappedTo).toContain("interactive-video");

    const validation = await validateElpx(result.elpx);
    expect(validation.ok).toBe(true);

    const zip = await JSZip.loadAsync(result.elpx);
    const xml = await zip.file("content.xml")!.async("string");
    expect(xml).toContain("<odeIdeviceTypeName>interactive-video</odeIdeviceTypeName>");
    expect(xml).toContain('id="exe-interactive-video-file"');

    const m = xml.match(/exe-interactive-video-contents[^>]*>(\{[\s\S]*?\})<\/div>/);
    expect(m).not.toBeNull();
    const contents = JSON.parse(m![1]!);
    expect(contents.slides).toHaveLength(2);
    expect(contents.slides[0].type).toBe("text");
    expect(contents.slides[0].startTime).toBe(2);
    expect(contents.slides[1].type).toBe("singleChoice");
    expect(contents.slides[1].startTime).toBe(5);
    expect(contents.slides[1].answers[1]).toEqual(["B", 1]);
  });
});
