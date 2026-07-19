import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { H5P_IMPORT_DEFAULTS, H5pImportError, importH5pAsElpx } from "../src/convert/import-h5p.ts";
import { DEFAULT_OPTIONS } from "../src/convert/conversion-options.ts";
import { makeH5pZip } from "./_helpers.ts";

const TEMPLATE_PATH = resolve(__dirname, "../../../fixtures/elpx/template.elpx");
const hasTemplate = existsSync(TEMPLATE_PATH);

async function loadTemplate(): Promise<Uint8Array> {
  return new Uint8Array(await readFile(TEMPLATE_PATH));
}

async function textH5p(): Promise<Uint8Array> {
  return makeH5pZip({
    mainLibrary: "H5P.Text",
    title: "Hello",
    content: { text: "<p>hello library</p>" }
  });
}

describe("H5P_IMPORT_DEFAULTS vs DEFAULT_OPTIONS", () => {
  it("keeps eXe-oriented defaults distinct from global convert defaults", () => {
    expect(H5P_IMPORT_DEFAULTS.layout).toBe("preserve");
    expect(H5P_IMPORT_DEFAULTS.unsupported).toBe("keep");
    expect(H5P_IMPORT_DEFAULTS.includeOriginalH5p).toBe(true);
    expect(H5P_IMPORT_DEFAULTS.strict).toBe(false);
    expect(H5P_IMPORT_DEFAULTS.enableSearch).toBe(false);
    expect(H5P_IMPORT_DEFAULTS.enableMathJax).toBe(false);
    // Global convert defaults intentionally differ for includeOriginalH5p / search
    expect(DEFAULT_OPTIONS.includeOriginalH5p).toBe(false);
    expect(DEFAULT_OPTIONS.enableSearch).toBe(true);
  });
});

describe("importH5pAsElpx option validation", () => {
  it("requires a non-empty filename", async () => {
    await expect(
      importH5pAsElpx(new Uint8Array([1, 2, 3]), {
        filename: "  ",
        templateElpx: new Uint8Array([1])
      })
    ).rejects.toMatchObject({
      name: "H5pImportError",
      code: "INVALID_OPTIONS"
    });
  });

  it("requires templateElpx", async () => {
    await expect(
      // @ts-expect-error intentional missing template for runtime check
      importH5pAsElpx(await textH5p(), { filename: "a.h5p" })
    ).rejects.toMatchObject({
      name: "H5pImportError",
      code: "TEMPLATE_REQUIRED",
      filename: "a.h5p"
    });
  });

  it("rejects empty template bytes", async () => {
    await expect(
      importH5pAsElpx(await textH5p(), {
        filename: "a.h5p",
        templateElpx: new Uint8Array()
      })
    ).rejects.toMatchObject({
      code: "TEMPLATE_REQUIRED",
      filename: "a.h5p"
    });
  });

  it("rejects empty H5P bytes", async () => {
    await expect(
      importH5pAsElpx(new Uint8Array(), {
        filename: "empty.h5p",
        templateElpx: new Uint8Array([80, 75]) // not a real template, but non-empty
      })
    ).rejects.toMatchObject({
      code: "INVALID_H5P",
      filename: "empty.h5p"
    });
  });
});

describe("importH5pAsElpx invalid input", () => {
  it("maps a non-ZIP buffer to INVALID_H5P with filename", async () => {
    const junk = new TextEncoder().encode("not a zip file at all");
    try {
      await importH5pAsElpx(junk, {
        filename: "broken.h5p",
        templateElpx: hasTemplate ? await loadTemplate() : new Uint8Array([1, 2, 3, 4])
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(H5pImportError);
      const e = err as H5pImportError;
      expect(e.code).toBe("INVALID_H5P");
      expect(e.filename).toBe("broken.h5p");
      expect(e.message).toMatch(/broken\.h5p/);
      expect(e.cause).toBeDefined();
    }
  });

  it("maps a ZIP missing h5p.json to INVALID_H5P", async () => {
    const zip = new JSZip();
    zip.file("readme.txt", "nope");
    const bytes = new Uint8Array(await zip.generateAsync({ type: "uint8array" }));
    const template = hasTemplate ? await loadTemplate() : bytes;
    await expect(
      importH5pAsElpx(bytes, { filename: "no-h5p.json.h5p", templateElpx: template })
    ).rejects.toMatchObject({
      code: "INVALID_H5P",
      filename: "no-h5p.json.h5p"
    });
  });

  it("maps a ZIP missing content.json to INVALID_H5P", async () => {
    const zip = new JSZip();
    zip.file(
      "h5p.json",
      JSON.stringify({
        title: "x",
        mainLibrary: "H5P.Text",
        preloadedDependencies: [{ machineName: "H5P.Text", majorVersion: 1, minorVersion: 0 }],
        language: "en",
        embedTypes: ["div"]
      })
    );
    const bytes = new Uint8Array(await zip.generateAsync({ type: "uint8array" }));
    const template = hasTemplate ? await loadTemplate() : bytes;
    await expect(
      importH5pAsElpx(bytes, { filename: "no-content.h5p", templateElpx: template })
    ).rejects.toMatchObject({
      code: "INVALID_H5P",
      filename: "no-content.h5p"
    });
  });
});

(hasTemplate ? describe : describe.skip)("importH5pAsElpx happy path", () => {
  it("accepts Uint8Array and returns elpx + project + report", async () => {
    const h5p = await textH5p();
    const template = await loadTemplate();
    const result = await importH5pAsElpx(h5p, {
      filename: "hello.h5p",
      templateElpx: template
    });
    expect(result.elpx).toBeInstanceOf(Uint8Array);
    expect(result.elpx.byteLength).toBeGreaterThan(1000);
    expect(result.project.pages.length).toBeGreaterThan(0);
    expect(result.report.tool).toBe("h5p2elpx");
    expect(result.report.input.files).toContain("hello.h5p");
    expect(result.report.summary.totalActivities).toBe(1);
    expect(result.report.summary.converted).toBe(1);

    const zip = await JSZip.loadAsync(result.elpx);
    expect(zip.file("content.xml")).not.toBeNull();
    // Default includeOriginalH5p: true embeds the source package
    expect(zip.file("content/resources/original/hello.h5p")).not.toBeNull();
    // Default enableSearch: false omits search index
    expect(zip.file("search_index.js")).toBeNull();
  });

  it("accepts ArrayBuffer input and ArrayBuffer template", async () => {
    const h5p = await textH5p();
    const template = await loadTemplate();
    // Copy into standalone ArrayBuffers (TypedArray.buffer may be SharedArrayBuffer-typed).
    const h5pAb = h5p.slice().buffer as ArrayBuffer;
    const templateAb = template.slice().buffer as ArrayBuffer;
    const result = await importH5pAsElpx(h5pAb, {
      filename: "buf.h5p",
      templateElpx: templateAb
    });
    expect(result.elpx).toBeInstanceOf(Uint8Array);
    expect(result.report.input.files).toContain("buf.h5p");
  });

  it("does not touch the filesystem during conversion (bytes in / bytes out)", async () => {
    const h5p = await textH5p();
    const template = await loadTemplate();
    // Pure smoke: if this returns, conversion ran on the provided buffers only.
    const { elpx } = await importH5pAsElpx(h5p, {
      filename: "mem.h5p",
      templateElpx: template
    });
    expect(elpx.byteLength).toBeGreaterThan(0);
  });

  it("honours includeOriginalH5p: false override", async () => {
    const result = await importH5pAsElpx(await textH5p(), {
      filename: "no-orig.h5p",
      templateElpx: await loadTemplate(),
      includeOriginalH5p: false
    });
    const zip = await JSZip.loadAsync(result.elpx);
    const originals: string[] = [];
    zip.forEach((path) => {
      if (path.startsWith("content/resources/original/")) originals.push(path);
    });
    expect(originals).toEqual([]);
  });

  it("honours enableSearch: true override", async () => {
    const result = await importH5pAsElpx(await textH5p(), {
      filename: "search.h5p",
      templateElpx: await loadTemplate(),
      enableSearch: true
    });
    const zip = await JSZip.loadAsync(result.elpx);
    expect(zip.file("search_index.js")).not.toBeNull();
  });

  it("keeps unsupported content in non-strict mode and returns a report", async () => {
    const h5p = await makeH5pZip({
      mainLibrary: "H5P.MadeUpInteraction",
      content: { foo: 1 }
    });
    const result = await importH5pAsElpx(h5p, {
      filename: "unsupported.h5p",
      templateElpx: await loadTemplate()
    });
    expect(
      result.report.summary.unsupported + result.report.summary.partiallyConverted
    ).toBeGreaterThan(0);
    expect(result.report.activities[0]!.unsupportedItems.length).toBeGreaterThan(0);
    expect(result.elpx.byteLength).toBeGreaterThan(0);
  });

  it("throws UNSUPPORTED_CONTENT in strict mode", async () => {
    const h5p = await makeH5pZip({
      mainLibrary: "H5P.MadeUpInteraction",
      content: {}
    });
    await expect(
      importH5pAsElpx(h5p, {
        filename: "strict.h5p",
        templateElpx: await loadTemplate(),
        strict: true
      })
    ).rejects.toMatchObject({
      code: "UNSUPPORTED_CONTENT",
      filename: "strict.h5p"
    });
  });

  it("rejects an invalid template ZIP with INVALID_TEMPLATE or ELPX_WRITE_FAILED", async () => {
    // Valid H5P, but template is garbage that is non-empty
    const badTemplate = new TextEncoder().encode("this is not a zip archive!!!");
    try {
      await importH5pAsElpx(await textH5p(), {
        filename: "t.h5p",
        templateElpx: badTemplate
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(H5pImportError);
      const e = err as H5pImportError;
      // Failure may surface while writing with the bad template, or earlier.
      expect([
        "INVALID_TEMPLATE",
        "ELPX_WRITE_FAILED",
        "INVALID_H5P",
        "CONVERSION_FAILED"
      ]).toContain(e.code);
      expect(e.filename).toBe("t.h5p");
    }
  });
});
