import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { convert } from "../src/convert/convert.ts";
import { makeH5pZip } from "./_helpers.ts";

const TEMPLATE_PATH = resolve(__dirname, "../../../fixtures/elpx/template.elpx");
const hasTemplate = existsSync(TEMPLATE_PATH);

async function loadTemplate(): Promise<Uint8Array> {
  return new Uint8Array(await readFile(TEMPLATE_PATH));
}

async function convertText(opts: Record<string, unknown> = {}) {
  const templateBytes = await loadTemplate();
  const h5p = await makeH5pZip({
    mainLibrary: "H5P.Text",
    content: { text: "<p>hi</p>" }
  });
  return convert([{ kind: "h5p-bytes", data: h5p, filename: "t.h5p" }], {
    templateBytes,
    ...opts
  });
}

(hasTemplate ? describe : describe.skip)("conversion option flags", () => {
  it("enableSearch=false omits search_index.js and its <script> tag", async () => {
    const result = await convertText({ enableSearch: false });
    const zip = await JSZip.loadAsync(result.elpx);
    expect(zip.file("search_index.js")).toBeNull();
    const html = await zip.file("index.html")!.async("string");
    expect(html).not.toContain("search_index.js");
  });

  it("enableSearch=true (default) ships search_index.js and references it", async () => {
    const result = await convertText({ enableSearch: true });
    const zip = await JSZip.loadAsync(result.elpx);
    expect(zip.file("search_index.js")).not.toBeNull();
    const html = await zip.file("index.html")!.async("string");
    expect(html).toContain("search_index.js");
  });

  it("enableMathJax=true injects the MathJax CDN script tag", async () => {
    const result = await convertText({ enableMathJax: true });
    const zip = await JSZip.loadAsync(result.elpx);
    const html = await zip.file("index.html")!.async("string");
    expect(html).toContain("mathjax@3");
    expect(html).toContain("tex-mml-chtml.js");
  });

  it("enableMathJax=false (default) does not include MathJax", async () => {
    const result = await convertText({});
    const zip = await JSZip.loadAsync(result.elpx);
    const html = await zip.file("index.html")!.async("string");
    expect(html).not.toContain("mathjax");
  });

  it("theme=nova swaps theme/* and drops the themes/ staging dir", async () => {
    const result = await convertText({ theme: "nova" });
    const zip = await JSZip.loadAsync(result.elpx);
    // theme/ files come from the nova bundle
    expect(zip.file("theme/style.css")).not.toBeNull();
    // staging area for unselected themes is gone
    const stagingRemnants: string[] = [];
    zip.forEach((path) => {
      if (path.startsWith("themes/")) stagingRemnants.push(path);
    });
    expect(stagingRemnants).toEqual([]);
  });

  it("theme=base (default) also drops the themes/ staging dir", async () => {
    const result = await convertText({ theme: "base" });
    const zip = await JSZip.loadAsync(result.elpx);
    const stagingRemnants: string[] = [];
    zip.forEach((path) => {
      if (path.startsWith("themes/")) stagingRemnants.push(path);
    });
    expect(stagingRemnants).toEqual([]);
  });
});
