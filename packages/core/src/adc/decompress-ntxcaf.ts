const NTX_CAPTURE = /ntxCafCompressed\s*=\s*"([^"]+)"/;

/**
 * Recover the `ntxdat` JSON object that ADC bundles ship inside the
 * `var ntxCafCompressed = "<base64>"` blob in `index.html`. The blob is
 * base64-encoded zlib data (RFC 1950), not encryption — useful when a
 * bundle has been stripped of `project.json` (some learner-facing SCORM
 * packages ship only the runtime + payload).
 */
export function extractNtxCafBase64(html: string): string | null {
  const m = html.match(NTX_CAPTURE);
  return m?.[1] ? m[1] : null;
}

export async function decompressNtxCaf(base64: string): Promise<unknown> {
  const compressed = base64ToBytes(base64);
  // Copy into a fresh ArrayBuffer-backed view so the Blob constructor's
  // BlobPart signature accepts it across DOM/Node/Bun lib typings.
  const buf = new ArrayBuffer(compressed.byteLength);
  new Uint8Array(buf).set(compressed);
  const blob = new Blob([buf]);
  const stream = blob.stream().pipeThrough(new DecompressionStream("deflate"));
  const text = await new Response(stream).text();
  return JSON.parse(text);
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof atob === "function") {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  const g = globalThis as { Buffer?: { from(b: string, enc: string): Uint8Array } };
  if (g.Buffer) return new Uint8Array(g.Buffer.from(b64, "base64"));
  throw new Error("No base64 decoder available in this environment");
}
