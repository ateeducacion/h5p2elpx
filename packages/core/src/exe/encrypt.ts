/**
 * Mirrors the `encrypt` helper used by eXeLearning's gamification iDevices
 * (crossword, sort, classify, identify, hidden-image, padlock, …).
 *
 * Source: `public/app/common/common.js` — `$exeDevices.iDevice.gamification.helpers.encrypt`:
 *
 *   encrypt(str) =>
 *     escape(
 *       str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 146)).join('')
 *     )
 *
 * The output is what gets written into the `crucigrama-DataGame` (and
 * equivalents) hidden divs and into the `dataGame` JSON property. The
 * runtime decrypts on load. URI-encoded *plaintext* JSON does not work —
 * eXe XORs every char with 146 first and then runs the legacy `escape()`.
 *
 * JS `escape()` is *not* the same as `encodeURIComponent`: it keeps
 * `A-Z a-z 0-9 @ * _ + - . /` unescaped and percent-encodes everything
 * else as `%XX` for code points 0-255 and `%uXXXX` for higher.
 */
const ESCAPE_KEEP = new Set<number>();
for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@*_+-./") {
  ESCAPE_KEEP.add(c.charCodeAt(0));
}

function legacyEscape(input: string): string {
  let out = "";
  for (const ch of input) {
    const cp = ch.codePointAt(0)!;
    if (ESCAPE_KEEP.has(cp)) {
      out += ch;
    } else if (cp < 256) {
      out += `%${cp.toString(16).toUpperCase().padStart(2, "0")}`;
    } else {
      out += `%u${cp.toString(16).toUpperCase().padStart(4, "0")}`;
    }
  }
  return out;
}

export function encryptGameData(str: string): string {
  if (!str) return "";
  const KEY = 146;
  const xored = Array.from(str)
    .map((c) => String.fromCharCode(c.charCodeAt(0) ^ KEY))
    .join("");
  return legacyEscape(xored);
}
