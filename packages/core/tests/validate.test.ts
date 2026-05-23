import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { validateElpx } from "../src/exe/validate.ts";
import { convert } from "../src/convert/convert.ts";
import { makeH5pZip } from "./_helpers.ts";

describe("validateElpx", () => {
  it("flags a non-ZIP as invalid", async () => {
    const r = await validateElpx(new Uint8Array([1, 2, 3]));
    expect(r.ok).toBe(false);
  });

  it("flags a ZIP without content.xml as invalid", async () => {
    const z = new JSZip();
    z.file("readme.txt", "hi");
    const bytes = new Uint8Array(await z.generateAsync({ type: "uint8array" }));
    const r = await validateElpx(bytes);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.message.includes("Missing content.xml"))).toBe(true);
  });

  it("passes a freshly-converted .elpx", async () => {
    const bytes = await makeH5pZip({ mainLibrary: "H5P.Text", content: { text: "hi" } });
    const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "a.h5p" }]);
    const r = await validateElpx(result.elpx);
    expect(r.ok).toBe(true);
    expect(r.stats.pages).toBeGreaterThan(0);
    expect(r.stats.iDevices).toBeGreaterThan(0);
  });
});
