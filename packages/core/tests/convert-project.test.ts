import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { convert, convertH5pToElpxProject, convertToElpxProject } from "../src/convert/convert.ts";
import { writeElpx } from "../src/exe/elpx-writer.ts";
import { makeH5pZip } from "./_helpers.ts";

const TEMPLATE_PATH = resolve(__dirname, "../../../fixtures/elpx/template.elpx");
const hasTemplate = existsSync(TEMPLATE_PATH);
const ADC_FIXTURE = resolve(__dirname, "../../../fixtures/adc/sa1-zip.zip");
const hasAdc = existsSync(ADC_FIXTURE);

async function loadTemplate(): Promise<Uint8Array> {
  return new Uint8Array(await readFile(TEMPLATE_PATH));
}

describe("convertToElpxProject", () => {
  it("builds a project and report without producing an .elpx ZIP", async () => {
    const h5p = await makeH5pZip({
      mainLibrary: "H5P.Text",
      content: { text: "<p>stage only</p>" }
    });
    const stage = await convertToElpxProject(
      [{ kind: "h5p-bytes", data: h5p, filename: "stage.h5p" }],
      { includeOriginalH5p: true }
    );
    expect(stage.project.pages.length).toBeGreaterThan(0);
    expect(stage.report.summary.totalActivities).toBe(1);
    expect(stage.originalH5pPackages?.length).toBe(1);
    expect(stage.originalH5pPackages?.[0]?.name).toBe("stage.h5p");
    // No elpx field on the project-stage result
    expect("elpx" in stage).toBe(false);
  });

  it("convert() delegates to the project stage then writeElpx", async () => {
    const h5p = await makeH5pZip({
      mainLibrary: "H5P.Text",
      content: { text: "<p>compat</p>" }
    });
    const inputs = [{ kind: "h5p-bytes" as const, data: h5p, filename: "c.h5p" }];
    const stage = await convertToElpxProject(inputs, {});
    const full = await convert(inputs, {});
    expect(full.project.pages.length).toBe(stage.project.pages.length);
    expect(full.report.summary).toEqual(stage.report.summary);
    expect(full.elpx).toBeInstanceOf(Uint8Array);
    expect(full.elpx.byteLength).toBeGreaterThan(0);
  });

  it("convertH5pToElpxProject is an alias of convertToElpxProject", async () => {
    expect(convertH5pToElpxProject).toBe(convertToElpxProject);
  });

  it("preserves original H5P packages through writeElpx after the project stage", async () => {
    const h5p = await makeH5pZip({
      mainLibrary: "H5P.Text",
      content: { text: "<p>orig</p>" }
    });
    const stage = await convertToElpxProject(
      [{ kind: "h5p-bytes", data: h5p, filename: "orig.h5p" }],
      { includeOriginalH5p: true }
    );
    const elpx = await writeElpx(stage.project, {
      originalH5pPackages: stage.originalH5pPackages
    });
    const zip = await JSZip.loadAsync(elpx);
    expect(zip.file("content/resources/original/orig.h5p")).not.toBeNull();
  });
});

(hasAdc ? describe : describe.skip)("convertToElpxProject ADC regression", () => {
  it("still converts ADC zip-bytes without writing .elpx at the project stage", async () => {
    const data = new Uint8Array(await readFile(ADC_FIXTURE));
    const stage = await convertToElpxProject(
      [{ kind: "zip-bytes", data, filename: "sa1-zip.zip" }],
      {}
    );
    expect(stage.project.pages.length).toBeGreaterThan(0);
    expect(stage.report.summary.totalActivities).toBeGreaterThan(0);
    expect(stage.report.summary.unsupported).toBe(0);
  });
});

(hasTemplate ? describe : describe.skip)("convertToElpxProject + writeElpx with template", () => {
  it("produces a full .elpx when the host writes the stage result", async () => {
    const h5p = await makeH5pZip({
      mainLibrary: "H5P.Text",
      content: { text: "<p>templated</p>" }
    });
    const stage = await convertToElpxProject(
      [{ kind: "h5p-bytes", data: h5p, filename: "t.h5p" }],
      {}
    );
    const elpx = await writeElpx(stage.project, {
      templateBytes: await loadTemplate(),
      originalH5pPackages: stage.originalH5pPackages,
      theme: stage.options.theme,
      enableSearch: stage.options.enableSearch,
      enableMathJax: stage.options.enableMathJax
    });
    const zip = await JSZip.loadAsync(elpx);
    expect(zip.file("content.xml")).not.toBeNull();
    expect(zip.file("theme/config.xml")).not.toBeNull();
  });
});
