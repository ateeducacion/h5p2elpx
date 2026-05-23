/**
 * 1280×720 transparent PNG, base64-encoded.
 *
 * eXeLearning v4 requires a root-level `screenshot.png` whose first 8 bytes
 * are the PNG magic signature (`89 50 4E 47 0D 0A 1A 0A`). We ship this
 * placeholder so a converted `.elpx` is valid even when the H5P provided no
 * cover image.
 *
 * The PNG was built with ImageMagick: a 1×1 fully-transparent IDAT (single
 * pixel), then declared as 1280×720 in the IHDR. eXe doesn't read the
 * actual dimensions — only the magic bytes.
 */
const BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAABQAAAALQCAQAAACEPEacAAAAAXNSR0IArs4c6QAAAARnQU1BAACx" +
  "jwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAfSURBVHja7cExAQAAAMKg9U9tCF8gAAAAAAAA" +
  "AAAAvA0hAAABS9bC/QAAAABJRU5ErkJggg==";

function base64ToUint8Array(b64: string): Uint8Array {
  // Browser path
  if (typeof atob === "function") {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  // Node path
  return new Uint8Array(Buffer.from(b64, "base64"));
}

export const DEFAULT_SCREENSHOT_PNG: Uint8Array = base64ToUint8Array(BASE64);
