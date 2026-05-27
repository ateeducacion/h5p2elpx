import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { convert } from "../src/convert/convert.ts";
import { validateElpx } from "../src/exe/validate.ts";

const FIXTURES = resolve(__dirname, "../../../fixtures/adc");

const samples = [
  { file: "sa1-native.zip", expectMainLibrary: "ADC.native-content" },
  { file: "sa1-altia-zip.zip", expectMainLibrary: "ADC.altia-zip" },
  { file: "sa1-altia-scorm12.zip", expectMainLibrary: "ADC.altia-scorm12" }
];

describe("ADC fixtures (end-to-end via zip-bytes sniff)", () => {
  for (const sample of samples) {
    const path = resolve(FIXTURES, sample.file);
    const skip = !existsSync(path);
    (skip ? it.skip : it)(
      `${sample.file}: sniffs, converts, validates`,
      async () => {
        const bytes = new Uint8Array(await readFile(path));
        const result = await convert([{ kind: "zip-bytes", data: bytes, filename: sample.file }]);
        expect(result.report.activities.length).toBe(1);
        const a = result.report.activities[0]!;
        expect(a.mainLibrary).toBe(sample.expectMainLibrary);
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
