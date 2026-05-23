/**
 * `content/content.json` has a wildly different shape per H5P library.
 * We do not validate it here — adapters interpret it. We only ensure it
 * is valid JSON and return it as `unknown`.
 */
export function parseContentJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`content/content.json is not valid JSON: ${(err as Error).message}`);
  }
}
