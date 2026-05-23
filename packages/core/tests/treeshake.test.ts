import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { convert } from "../src/convert/convert.ts";
import { makeH5pZip } from "./_helpers.ts";

/**
 * The writer clones the eXeLearning runtime template (which ships ~43
 * iDevice subfolders, ~4 MB) and then drops the ones we don't use, the
 * same way eXeLearning's own exporter does on export. The tests below
 * only run when the prebuilt fixtures/elpx/template.elpx is present
 * (skipped otherwise so a fresh checkout without `bun run build-template`
 * still passes CI).
 */

const TEMPLATE_PATH = resolve(__dirname, "../../../fixtures/elpx/template.elpx");
const hasTemplate = existsSync(TEMPLATE_PATH);

async function loadTemplateBytes(): Promise<Uint8Array> {
  return new Uint8Array(await readFile(TEMPLATE_PATH));
}

(hasTemplate ? describe : describe.skip)("iDevice runtime tree-shake", () => {
  it("a text-only conversion only keeps idevices/text/*", async () => {
    const templateBytes = await loadTemplateBytes();
    const h5p = await makeH5pZip({
      mainLibrary: "H5P.Text",
      content: { text: "<p>just text</p>" }
    });
    const result = await convert([{ kind: "h5p-bytes", data: h5p, filename: "t.h5p" }], {
      templateBytes
    });
    const zip = await JSZip.loadAsync(result.elpx);
    const used = new Set<string>();
    zip.forEach((path, file) => {
      if (!file.dir) {
        const m = path.match(/^idevices\/([^/]+)\//);
        if (m?.[1]) used.add(m[1]);
      }
    });
    expect(used.has("text")).toBe(true);
    expect(used.has("crossword")).toBe(false);
    expect(used.has("trueorfalse")).toBe(false);
    expect(used.has("form")).toBe(false);
  });

  it("a multichoice conversion ships form but not e.g. crossword/interactive-video", async () => {
    const templateBytes = await loadTemplateBytes();
    const h5p = await makeH5pZip({
      mainLibrary: "H5P.MultiChoice",
      content: {
        question: "Pick one",
        answers: [
          { text: "A", correct: true },
          { text: "B", correct: false }
        ]
      }
    });
    const result = await convert([{ kind: "h5p-bytes", data: h5p, filename: "mc.h5p" }], {
      templateBytes
    });
    const zip = await JSZip.loadAsync(result.elpx);
    const used = new Set<string>();
    zip.forEach((path, file) => {
      if (!file.dir) {
        const m = path.match(/^idevices\/([^/]+)\//);
        if (m?.[1]) used.add(m[1]);
      }
    });
    expect(used.has("form")).toBe(true);
    expect(used.has("crossword")).toBe(false);
    expect(used.has("interactive-video")).toBe(false);
  });
});
