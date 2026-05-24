import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { convert } from "@ateeducacion/h5p2elpx-core";

const HERE = fileURLToPath(new URL(".", import.meta.url));
export const REPO_ROOT = resolve(HERE, "../../../..");
export const H5P_FIXTURES = resolve(REPO_ROOT, "fixtures/h5p");

export type BuiltElpx = {
  bytes: Uint8Array;
  filename: string;
};

export async function buildElpxFromH5p(h5pName: string): Promise<BuiltElpx> {
  const path = resolve(H5P_FIXTURES, h5pName);
  const data = new Uint8Array(await readFile(path));
  const result = await convert([{ kind: "h5p-bytes", data, filename: basename(path) }]);
  return {
    bytes: result.elpx,
    filename: basename(path).replace(/\.h5p$/i, ".elpx")
  };
}
