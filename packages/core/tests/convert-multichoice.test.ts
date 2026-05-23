import { describe, it, expect } from "vitest";
import { convert } from "../src/convert/convert.ts";
import { makeH5pZip } from "./_helpers.ts";

describe("convert H5P.MultiChoice", () => {
  it("maps to quick-questions iDevice", async () => {
    const bytes = await makeH5pZip({
      mainLibrary: "H5P.MultiChoice",
      content: {
        question: "Pick a color",
        answers: [
          { text: "Red", correct: true },
          { text: "Blue", correct: false }
        ]
      }
    });
    const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "mc.h5p" }]);
    const flat = result.project.pages.flatMap((p) => p.blocks.flatMap((b) => b.iDevices));
    expect(flat.some((i) => i.typeName === "quick-questions")).toBe(true);
    expect(result.report.summary.converted).toBe(1);
  });
});

describe("convert H5P.TrueFalse", () => {
  it("maps to trueorfalse iDevice", async () => {
    const bytes = await makeH5pZip({
      mainLibrary: "H5P.TrueFalse",
      content: { question: "The sky is blue", correct: "true" }
    });
    const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "tf.h5p" }]);
    const flat = result.project.pages.flatMap((p) => p.blocks.flatMap((b) => b.iDevices));
    expect(flat.some((i) => i.typeName === "trueorfalse")).toBe(true);
  });
});
