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
    (skip ? it.skip : it)(`${file} is a ZIP with content.xml + content.dtd and validates`, async () => {
      const bytes = new Uint8Array(await readFile(path));
      const zip = await JSZip.loadAsync(bytes);
      expect(zip.file("content.xml")).not.toBeNull();
      expect(zip.file("content.dtd")).not.toBeNull();
      const v = await validateElpx(bytes);
      expect(v.ok).toBe(true);
      expect(v.stats.pages).toBeGreaterThan(0);
    });
  }

  it("conversion preserves the template's theme/libs/idevices while replacing content.xml", async () => {
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
    expect(out.file("theme/style.css")).not.toBeNull();
    expect(out.file("index.html")).not.toBeNull();
    // content.xml is OUR rewritten one
    const xml = await out.file("content.xml")!.async("string");
    expect(xml).toContain("hello via template");
    expect(xml).toContain('xmlns="http://www.intef.es/xsd/ode"');

    const v = await validateElpx(result.elpx);
    expect(v.ok).toBe(true);
  });
});
