import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { convert } from "../src/convert/convert.ts";
import { makeH5pZip } from "./_helpers.ts";

describe("convert image H5P", () => {
  it("flattens H5P's images/ subfolder, lands at content/resources/, and references via {{context_path}}", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const bytes = await makeH5pZip({
      mainLibrary: "H5P.Image",
      content: { file: { path: "images/p.png" }, alt: "alt" },
      extras: { "content/images/p.png": png }
    });
    const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "img.h5p" }], {
      layout: "blocks"
    });
    const zip = await JSZip.loadAsync(result.elpx);

    // Asset is flat at the root of content/resources/, no H5P images/ subfolder.
    expect(zip.file("content/resources/p.png")).not.toBeNull();
    expect(zip.file("content/resources/images/p.png")).toBeNull();

    // No legacy per-activity nesting either.
    let foundLegacy = false;
    zip.forEach((path) => {
      if (path.includes("h5p2elpx/")) foundLegacy = true;
    });
    expect(foundLegacy).toBe(false);

    const xml = await zip.file("content.xml")!.async("string");
    // htmlView MUST use the {{context_path}}/<file> token form, not a
    // hard-coded relative path — eXe's importer converts the token to
    // asset://<uuid> on load.
    expect(xml).toContain("{{context_path}}/p.png");
    expect(xml).not.toContain("content/resources/images/p.png");
  });
});
