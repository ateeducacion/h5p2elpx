import { readFile, stat } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { convert } from "@h5p2elpx/core";

const HERE = fileURLToPath(new URL(".", import.meta.url));
export const REPO_ROOT = resolve(HERE, "../../..");
export const H5P_FIXTURES = resolve(REPO_ROOT, "fixtures/h5p");
export const EDITOR_DIR = resolve(HERE, "server-root/exe");

export async function editorAvailable(): Promise<boolean> {
  try {
    const versionFile = await stat(resolve(EDITOR_DIR, "VERSION"));
    if (!versionFile.isFile()) return false;
    const indexFile = await stat(resolve(EDITOR_DIR, "index.html"));
    return indexFile.isFile();
  } catch {
    return false;
  }
}

export async function buildElpxFromH5p(h5pName: string) {
  const path = resolve(H5P_FIXTURES, h5pName);
  const data = new Uint8Array(await readFile(path));
  const result = await convert([{ kind: "h5p-bytes", data, filename: basename(path) }]);
  return {
    bytes: result.elpx,
    report: result.report,
    filename: basename(path).replace(/\.h5p$/i, ".elpx")
  };
}
