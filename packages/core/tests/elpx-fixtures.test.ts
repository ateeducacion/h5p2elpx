import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import JSZip from "jszip";
import { validateElpx } from "../src/exe/validate.ts";
import { convert } from "../src/convert/convert.ts";
import { makeH5pZip } from "./_helpers.ts";

const ELPX_FIXTURES = resolve(__dirname, "../../../fixtures/elpx");

const realElpx = ["sample.elpx", "sample-with-content.elpx"];

describe("real eXeLearning .elpx fixtures", () => {
  for (const file of realElpx) {
    const path = resolve(ELPX_FIXTURES, file);
    const skip = !existsSync(path);
    (skip ? it.skip : it)(`${file} is a ZIP with content.xml + content.dtd`, async () => {
      const bytes = new Uint8Array(await readFile(path));
      const zip = await JSZip.loadAsync(bytes);
      expect(zip.file("content.xml")).not.toBeNull();
      expect(zip.file("content.dtd")).not.toBeNull();
    });
  }

  it("uses a real .elpx as --template and keeps its theme files intact", async () => {
    const templatePath = resolve(ELPX_FIXTURES, "sample.elpx");
    if (!existsSync(templatePath)) return;
    const templateBytes = new Uint8Array(await readFile(templatePath));

    const h5p = await makeH5pZip({
      mainLibrary: "H5P.Text",
      content: { text: "<p>hello via template</p>" }
    });
    const result = await convert(
      [{ kind: "h5p-bytes", data: h5p, filename: "t.h5p" }],
      { templateBytes }
    );

    const out = await JSZip.loadAsync(result.elpx);
    // theme files from the template survive
    expect(out.file("theme/style.css")).not.toBeNull();
    // h5p2elpx canonical content is injected alongside the original
    expect(out.file("h5p2elpx-content.xml")).not.toBeNull();
    // original content.xml/content.dtd from the template are preserved
    expect(out.file("content.xml")).not.toBeNull();

    const v = await validateElpx(result.elpx);
    expect(v.ok).toBe(true);
  });
});
