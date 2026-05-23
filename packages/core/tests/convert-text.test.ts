import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { convert } from "../src/convert/convert.ts";
import { validateElpx } from "../src/exe/validate.ts";
import { makeH5pZip } from "./_helpers.ts";

describe("convert text H5P", () => {
  it("produces a valid .elpx with a text iDevice in real eXe ode format", async () => {
    const bytes = await makeH5pZip({
      title: "Greeting",
      mainLibrary: "H5P.Text",
      content: { text: "<p>Hola <strong>mundo</strong></p>" }
    });
    const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "greet.h5p" }]);
    expect(result.report.summary.converted).toBe(1);
    expect(result.report.summary.unsupported).toBe(0);

    const validation = await validateElpx(result.elpx);
    expect(validation.ok).toBe(true);
    expect(validation.stats.iDevices).toBeGreaterThan(0);

    const zip = await JSZip.loadAsync(result.elpx);
    const xml = await zip.file("content.xml")!.async("string");
    const indexHtml = await zip.file("index.html")!.async("string");
    expect(xml).toContain('xmlns="http://www.intef.es/xsd/ode"');
    expect(xml).toContain("<odeNavStructures>");
    expect(xml).toContain("<odeIdeviceTypeName>text</odeIdeviceTypeName>");
    expect(xml).toContain("exe-text-template");
    expect(xml).toContain("Hola");
    expect(indexHtml).toContain("Hola");
    expect(indexHtml).toContain('class="idevice_node text"');
    expect(zip.file("search_index.js")).not.toBeNull();
  });
});
