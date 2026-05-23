import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { convert } from "../src/convert/convert.ts";
import { makeH5pZip } from "./_helpers.ts";

describe("convert image H5P", () => {
  it("copies the asset under content/resources/ (flat, preserving sub-folders) and rewrites the src path", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const bytes = await makeH5pZip({
      mainLibrary: "H5P.Image",
      content: { file: { path: "images/p.png" }, alt: "alt" },
      extras: { "content/images/p.png": png }
    });
    const result = await convert(
      [{ kind: "h5p-bytes", data: bytes, filename: "img.h5p" }],
      { layout: "blocks" }
    );
    const zip = await JSZip.loadAsync(result.elpx);
    // Flat path under content/resources/, preserving the source's sub-folder.
    expect(zip.file("content/resources/images/p.png")).not.toBeNull();
    // The h5p2elpx/<activityId> nesting must NOT appear.
    let foundLegacy = false;
    zip.forEach((path) => {
      if (path.includes("h5p2elpx/")) foundLegacy = true;
    });
    expect(foundLegacy).toBe(false);
    const xml = await zip.file("content.xml")!.async("string");
    expect(xml).toContain("content/resources/images/p.png");
  });
});
