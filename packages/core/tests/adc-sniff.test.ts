import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import JSZip from "jszip";
import { sniffAdcZip } from "../src/adc/sniff.ts";

const FIXTURES = resolve(__dirname, "../../../fixtures/adc");

describe("sniffAdcZip", () => {
  it("recognises native Content/ADC bundles", async () => {
    const bytes = new Uint8Array(await readFile(resolve(FIXTURES, "sa1-native.zip")));
    const r = await sniffAdcZip(bytes);
    expect(r).not.toBeNull();
    expect(r!.flavor).toBe("native-content");
  });

  it("recognises altia plain zip bundles", async () => {
    const bytes = new Uint8Array(await readFile(resolve(FIXTURES, "sa1-altia-zip.zip")));
    const r = await sniffAdcZip(bytes);
    expect(r).not.toBeNull();
    expect(r!.flavor).toBe("altia-zip");
    expect(r!.hasPlainJson).toBe(true);
  });

  it("recognises altia SCORM 1.2 bundles", async () => {
    const bytes = new Uint8Array(await readFile(resolve(FIXTURES, "sa1-altia-scorm12.zip")));
    const r = await sniffAdcZip(bytes);
    expect(r).not.toBeNull();
    expect(r!.flavor).toBe("altia-scorm12");
  });

  it("returns null for an unrelated zip", async () => {
    const zip = new JSZip();
    zip.file("hello.txt", "world");
    const bytes = new Uint8Array(await zip.generateAsync({ type: "uint8array" }));
    expect(await sniffAdcZip(bytes)).toBeNull();
  });

  it("returns null for non-zip bytes", async () => {
    const bytes = new TextEncoder().encode("not a zip");
    expect(await sniffAdcZip(bytes)).toBeNull();
  });
});
