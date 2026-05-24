import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
export const EDITOR_DIR = resolve(HERE, "../server-root/exe");

export async function editorAvailable(): Promise<boolean> {
  try {
    const v = await stat(resolve(EDITOR_DIR, "VERSION"));
    if (!v.isFile()) return false;
    const idx = await stat(resolve(EDITOR_DIR, "index.html"));
    return idx.isFile();
  } catch {
    return false;
  }
}
