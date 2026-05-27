import { describe, it, expect } from "vitest";
import { deflateSync } from "node:zlib";
import { decompressNtxCaf, extractNtxCafBase64 } from "../src/adc/decompress-ntxcaf.ts";

function makeNtxCaf(payload: unknown): string {
  // The authoring tool emits raw zlib (RFC 1950), matching Node's deflate default.
  const compressed = deflateSync(Buffer.from(JSON.stringify(payload), "utf-8"));
  return compressed.toString("base64");
}

describe("ntxCafCompressed round-trip", () => {
  it("extracts the base64 blob from a fragment of index.html", () => {
    const html = `<html><body><script>var ntxCafCompressed = "abc123==";</script></body></html>`;
    expect(extractNtxCafBase64(html)).toBe("abc123==");
  });

  it("returns null when the marker is absent", () => {
    expect(extractNtxCafBase64("<html></html>")).toBeNull();
  });

  it("decompresses a synthetic ntxdat blob back to JSON", async () => {
    const original = {
      ntxdat: {
        project: { id: 42, name: "Test ADC project" },
        projectDataCollection: {
          es: {
            components: { root: { id: "root", name: "module", componentChildren: [] } }
          }
        }
      }
    };
    const b64 = makeNtxCaf(original);
    const recovered = await decompressNtxCaf(b64);
    expect(recovered).toEqual(original);
  });
});
