import JSZip from "jszip";

/**
 * Load a minimal `.elpx` template provided by the user (or fall back to an
 * empty template when none is supplied). Returns a JSZip instance the writer
 * can mutate freely.
 */
export async function loadTemplate(templateBytes?: Uint8Array): Promise<JSZip> {
  if (templateBytes && templateBytes.byteLength > 0) {
    return await JSZip.loadAsync(templateBytes);
  }
  return new JSZip();
}
