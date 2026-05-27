import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { convert } from "../src/convert/convert.ts";
import { validateElpx } from "../src/exe/validate.ts";

const FIXTURES = resolve(__dirname, "../../../fixtures/adc");

const samples = [
  // SA1 (three variants of the same content)
  { file: "sa1-native.zip", expectMainLibrary: "ADC.native", expectTeacher: true },
  { file: "sa1-zip.zip", expectMainLibrary: "ADC.zip", expectTeacher: true },
  { file: "sa1-scorm12.zip", expectMainLibrary: "ADC.scorm12", expectTeacher: true },
  // Additional units (different templates / topic shapes)
  { file: "sa9-native.zip", expectMainLibrary: "ADC.native", expectTeacher: false },
  { file: "md03-zip.zip", expectMainLibrary: "ADC.zip", expectTeacher: false },
  { file: "mercedes-zip.zip", expectMainLibrary: "ADC.zip", expectTeacher: false },
  { file: "quesada-zip.zip", expectMainLibrary: "ADC.zip", expectTeacher: false }
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
        expect(validation.stats.pages).toBeGreaterThan(1);
        expect(validation.stats.iDevices).toBeGreaterThan(0);

        // Project title must come from the package, not the fallback default.
        expect(result.project.title.length).toBeGreaterThan(3);
        expect(result.project.title).not.toBe("Imported content");

        // The cover IS the project root (promoted by promoteAdcCover): a
        // single top-level page that carries the rich-HTML banner from
        // adaptCover plus any content blocks the ADC `pageContent` had.
        // Subsequent pages nest under it.
        const roots = result.project.pages.filter((p) => !p.parentId);
        expect(roots.length).toBe(1);
        const cover = roots[0]!;
        const children = result.project.pages.filter((p) => p.parentId === cover.id);
        expect(children.length).toBeGreaterThan(0);
        const rootHtml = cover.blocks[0]?.iDevices[0]?.htmlView ?? "";
        expect(rootHtml).toMatch(/<section/);

        if (sample.expectTeacher) {
          const hasTeacherBlock = result.project.pages.some((p) =>
            p.blocks.some((b) => b.teacherOnly === true)
          );
          expect(hasTeacherBlock).toBe(true);
        }

        // No emitted iDevice should have a visually empty `htmlView` — that
        // would render as a blank box in eXe. Text iDevices are now skipped
        // when their sanitised html is empty.
        for (const page of result.project.pages) {
          for (const block of page.blocks) {
            for (const idev of block.iDevices) {
              if (idev.typeName !== "freeText") continue;
              const txt = (idev.htmlView ?? "")
                .replace(/<[^>]+>/g, "")
                .replace(/&nbsp;|&#160;/g, " ")
                .trim();
              const hasMedia = /<(img|iframe|audio|video|svg)\b/i.test(idev.htmlView ?? "");
              expect(txt.length > 0 || hasMedia).toBe(true);
            }
          }
        }
      },
      30_000
    );
  }
});
