import { describe, it, expect } from "vitest";
import { convert } from "../src/convert/convert.ts";
import { makeH5pZip } from "./_helpers.ts";

describe("unsupported handling", () => {
  it("default `keep` produces a visible unsupported iDevice and reports it", async () => {
    const bytes = await makeH5pZip({
      mainLibrary: "H5P.MadeUpInteraction",
      content: { foo: "bar" }
    });
    const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "x.h5p" }], {});
    expect(result.report.summary.unsupported).toBe(1);
    expect(result.report.activities[0]!.unsupportedItems.length).toBe(1);
    // Visible iDevice present
    const flat = result.project.pages.flatMap((p) => p.blocks.flatMap((b) => b.iDevices));
    expect(flat.some((i) => i.htmlView.includes("Unsupported H5P content"))).toBe(true);
  });

  it("`drop` removes the iDevice but still reports", async () => {
    const bytes = await makeH5pZip({
      mainLibrary: "H5P.MadeUpInteraction",
      content: {}
    });
    const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "x.h5p" }], {
      unsupported: "drop"
    });
    expect(result.report.activities[0]!.unsupportedItems.length).toBe(1);
    const flat = result.project.pages.flatMap((p) => p.blocks.flatMap((b) => b.iDevices));
    expect(flat.some((i) => i.htmlView.includes("Unsupported H5P content"))).toBe(false);
  });

  it("`--strict` throws when unsupported content exists", async () => {
    const bytes = await makeH5pZip({
      mainLibrary: "H5P.MadeUpInteraction",
      content: {}
    });
    await expect(
      convert([{ kind: "h5p-bytes", data: bytes, filename: "x.h5p" }], {
        strict: true
      })
    ).rejects.toThrow(/Strict mode/);
  });
});
