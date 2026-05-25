import { describe, it, expect } from "vitest";
import { convert } from "../src/convert/convert.ts";
import { makeH5pZip } from "./_helpers.ts";

describe("convert H5P.MultiChoice", () => {
  it("maps to the real eXe `form` iDevice with selectionType=single", async () => {
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
    const form = flat.find((i) => i.typeName === "form");
    expect(form).toBeDefined();
    const props = form!.jsonProperties as any;
    expect(Array.isArray(props.questionsData)).toBe(true);
    expect(props.questionsData[0].activityType).toBe("selection");
    expect(props.questionsData[0].selectionType).toBe("single");
    expect(props.questionsData[0].baseText).toBe("Pick a color");
    expect(props.questionsData[0].answers).toEqual([
      [true, "Red"],
      [false, "Blue"]
    ]);
    expect(result.report.summary.converted).toBe(1);
  });

  it("uses selectionType=multiple when more than one answer is correct", async () => {
    const bytes = await makeH5pZip({
      mainLibrary: "H5P.MultiChoice",
      content: {
        question: "Pick all warm colors",
        answers: [
          { text: "Red", correct: true },
          { text: "Blue", correct: false },
          { text: "Orange", correct: true }
        ]
      }
    });
    const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "mc2.h5p" }]);
    const flat = result.project.pages.flatMap((p) => p.blocks.flatMap((b) => b.iDevices));
    const form = flat.find((i) => i.typeName === "form")!;
    expect((form.jsonProperties as any).questionsData[0].selectionType).toBe("multiple");
  });
});

describe("convert H5P.TrueFalse", () => {
  it("maps to the real eXe `trueorfalse` game iDevice", async () => {
    const bytes = await makeH5pZip({
      mainLibrary: "H5P.TrueFalse",
      content: { question: "The sky is blue", correct: "true" }
    });
    const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "tf.h5p" }]);
    const flat = result.project.pages.flatMap((p) => p.blocks.flatMap((b) => b.iDevices));
    const tof = flat.find((i) => i.typeName === "trueorfalse")!;
    expect(tof).toBeDefined();
    const props = tof.jsonProperties as any;
    expect(props.typeGame).toBe("TrueOrFalse");
    expect(Array.isArray(props.questionsGame)).toBe(true);
    expect(props.questionsGame[0].solution).toBe(1);
    expect(props.msgs.msgTrue).toBe("True");
  });
});

describe("question adapters preserve `content.media.type` intro images", () => {
  // Tiny valid PNG (1x1 transparent pixel) so the asset path is real bytes.
  const PNG_1PX = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82
  ]);

  function imageMedia(path: string, alt = "intro") {
    return {
      media: {
        type: {
          library: "H5P.Image 1.1",
          params: { file: { path, mime: "image/png", width: 1, height: 1 }, alt }
        }
      }
    };
  }

  it("H5P.Blanks: prepends a <figure><img> to the form instructions", async () => {
    const bytes = await makeH5pZip({
      mainLibrary: "H5P.Blanks",
      content: {
        ...imageMedia("images/cat.png", "where is the cat"),
        text: "<p>Where is the cat?</p>",
        questions: ["The cat is *on* the table."]
      },
      extras: { "content/images/cat.png": PNG_1PX }
    });
    const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "bl.h5p" }]);
    const flat = result.project.pages.flatMap((p) => p.blocks.flatMap((b) => b.iDevices));
    const form = flat.find((i) => i.typeName === "form")!;
    const props = form.jsonProperties as any;
    expect(typeof props.eXeFormInstructions).toBe("string");
    expect(props.eXeFormInstructions).toContain('<img src="{{context_path}}/cat.png"');
    expect(props.eXeFormInstructions).toContain('alt="where is the cat"');
    // The asset was flattened into content/resources/<filename>.
    const res = result.project.resources.find((r) => r.path === "content/resources/cat.png");
    expect(res).toBeDefined();
  });

  it("H5P.MultiChoice: prepends a <figure><img> to the question baseText", async () => {
    const bytes = await makeH5pZip({
      mainLibrary: "H5P.MultiChoice",
      content: {
        ...imageMedia("images/colors.png"),
        question: "What colour is this?",
        answers: [
          { text: "Red", correct: true },
          { text: "Blue", correct: false }
        ]
      },
      extras: { "content/images/colors.png": PNG_1PX }
    });
    const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "mc.h5p" }]);
    const flat = result.project.pages.flatMap((p) => p.blocks.flatMap((b) => b.iDevices));
    const form = flat.find((i) => i.typeName === "form")!;
    const props = form.jsonProperties as any;
    const baseText = props.questionsData[0].baseText as string;
    expect(baseText).toContain('<img src="{{context_path}}/colors.png"');
    expect(baseText).toContain("What colour is this?");
    const res = result.project.resources.find((r) => r.path === "content/resources/colors.png");
    expect(res).toBeDefined();
  });

  it("H5P.TrueFalse: prepends a <figure><img> to the question text", async () => {
    const bytes = await makeH5pZip({
      mainLibrary: "H5P.TrueFalse",
      content: {
        ...imageMedia("images/sky.png"),
        question: "The sky is blue",
        correct: "true"
      },
      extras: { "content/images/sky.png": PNG_1PX }
    });
    const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "tf.h5p" }]);
    const flat = result.project.pages.flatMap((p) => p.blocks.flatMap((b) => b.iDevices));
    const tof = flat.find((i) => i.typeName === "trueorfalse")!;
    const props = tof.jsonProperties as any;
    const q = props.questionsGame[0].question as string;
    expect(q).toContain('<img src="{{context_path}}/sky.png"');
    const res = result.project.resources.find((r) => r.path === "content/resources/sky.png");
    expect(res).toBeDefined();
  });
});
