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
