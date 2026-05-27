import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { convert } from "../src/convert/convert.ts";
import { validateElpx } from "../src/exe/validate.ts";

const FIXTURES = resolve(__dirname, "../../../fixtures/adc");

const samples = [
  { file: "sa1-native.zip", expectMainLibrary: "ADC.native" },
  { file: "sa1-zip.zip", expectMainLibrary: "ADC.zip" },
  { file: "sa1-scorm12.zip", expectMainLibrary: "ADC.scorm12" }
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

        // Project title must come from the package, not the fallback default.
        expect(result.project.title).toMatch(/Qui[eé]n y c[oó]mo soy/);
        expect(result.project.language).toBe("es");

        // Pages must be nested under a single cover (no top-level duplicates):
        // exactly one root page, every other page declares it as parent.
        const roots = result.project.pages.filter((p) => !p.parentId);
        expect(roots.length).toBe(1);
        const cover = roots[0]!;
        for (const p of result.project.pages) {
          if (p.id === cover.id) continue;
          expect(p.parentId).toBe(cover.id);
        }

        // Sanity: at least 3 distinct sub-page titles (the SA1 fixture has 6),
        // proving we picked per-page titles rather than reusing the cover.
        const subTitles = new Set(
          result.project.pages.filter((p) => p.parentId).map((p) => p.title)
        );
        expect(subTitles.size).toBeGreaterThanOrEqual(3);
      },
      30_000
    );
  }
});
