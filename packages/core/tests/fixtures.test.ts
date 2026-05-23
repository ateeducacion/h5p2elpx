import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { convert } from "../src/convert/convert.ts";
import { validateElpx } from "../src/exe/validate.ts";

const FIXTURES = resolve(__dirname, "../../../fixtures/h5p");

const realSamples = [
  { file: "true-false-question.h5p", expectMainLibrary: "H5P.TrueFalse" },
  { file: "course-presentation.h5p", expectMainLibrary: "H5P.CoursePresentation" },
  { file: "interactive-book.h5p", expectMainLibrary: "H5P.InteractiveBook" },
  { file: "LumiH5PIDMultiChoiceTest.h5p", expectMainLibrary: "H5P.MultiChoice" }
];

describe("real H5P sample fixtures (end-to-end)", () => {
  for (const sample of realSamples) {
    const path = resolve(FIXTURES, sample.file);
    const skip = !existsSync(path);
    (skip ? it.skip : it)(
      `${sample.file}: converts and validates`,
      async () => {
        const bytes = new Uint8Array(await readFile(path));
        const result = await convert([
          { kind: "h5p-bytes", data: bytes, filename: sample.file }
        ]);
        expect(result.report.activities.length).toBe(1);
        expect(result.report.activities[0]!.mainLibrary).toContain(sample.expectMainLibrary);
        expect(result.report.summary.errors).toBe(0);
        const validation = await validateElpx(result.elpx);
        expect(validation.ok).toBe(true);
        expect(validation.stats.pages).toBeGreaterThan(0);
        expect(validation.stats.iDevices).toBeGreaterThan(0);
      },
      30_000
    );
  }
});
