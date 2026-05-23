import { describe, it, expect } from "vitest";
import { readH5p } from "../src/h5p/read-h5p.ts";
import { makeH5pZip } from "./_helpers.ts";

describe("readH5p", () => {
  it("reads a synthetic H5P.Text package", async () => {
    const bytes = await makeH5pZip({
      title: "Hello",
      mainLibrary: "H5P.Text",
      content: { text: "<p>Hello world</p>" }
    });
    const pkg = await readH5p(bytes, { sourceFilename: "hello.h5p" });
    expect(pkg.title).toBe("Hello");
    expect(pkg.mainLibrary.machineName).toBe("H5P.Text");
    expect((pkg.contentJson as any).text).toBe("<p>Hello world</p>");
    expect(pkg.assets.length).toBe(0);
  });

  it("reads an image asset under content/", async () => {
    const bytes = await makeH5pZip({
      mainLibrary: "H5P.Image",
      content: { file: { path: "images/p.png" } },
      extras: { "content/images/p.png": new Uint8Array([1, 2, 3]) }
    });
    const pkg = await readH5p(bytes);
    expect(pkg.assets.length).toBe(1);
    expect(pkg.assets[0]!.path).toBe("content/images/p.png");
    expect(pkg.assets[0]!.mimeType).toBe("image/png");
  });

  it("throws on missing h5p.json", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("content/content.json", "{}");
    const bytes = new Uint8Array(await zip.generateAsync({ type: "uint8array" }));
    await expect(readH5p(bytes)).rejects.toThrow(/h5p.json/);
  });

  it("keeps raw bytes when requested", async () => {
    const bytes = await makeH5pZip({ mainLibrary: "H5P.Text", content: { text: "" } });
    const pkg = await readH5p(bytes, { keepRawH5p: true });
    expect(pkg.rawH5p).toBeInstanceOf(Uint8Array);
  });
});
