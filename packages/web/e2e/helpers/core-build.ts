import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { importH5pAsElpx } from "@ateeducacion/h5p2elpx-core";

const HERE = fileURLToPath(new URL(".", import.meta.url));
export const REPO_ROOT = resolve(HERE, "../../../..");
export const H5P_FIXTURES = resolve(REPO_ROOT, "fixtures/h5p");
export const TEMPLATE_PATH = resolve(REPO_ROOT, "fixtures/elpx/template.elpx");

export type BuiltElpx = {
  bytes: Uint8Array;
  filename: string;
};

/** Cache the ~10 MB eXe template across e2e specs in the same worker. */
let cachedTemplate: Uint8Array | undefined;

async function loadTemplateElpx(): Promise<Uint8Array> {
  if (!cachedTemplate) {
    cachedTemplate = new Uint8Array(await readFile(TEMPLATE_PATH));
  }
  return cachedTemplate;
}

/**
 * Build an `.elpx` from an H5P fixture via the public browser API
 * (`importH5pAsElpx`), which is the contract eXeLearning will call.
 *
 * E2e deliberately turns off `includeOriginalH5p` so large fixtures
 * (e.g. interactive-book ~8 MB) do not embed a second full copy of the
 * source package on top of the 10 MB runtime template — that combination
 * OOMs GitHub Actions runners when several specs run in one worker.
 */
export async function buildElpxFromH5p(h5pName: string): Promise<BuiltElpx> {
  const path = resolve(H5P_FIXTURES, h5pName);
  const data = new Uint8Array(await readFile(path));
  const templateElpx = await loadTemplateElpx();
  const result = await importH5pAsElpx(data, {
    filename: basename(path),
    templateElpx,
    includeOriginalH5p: false
  });
  return {
    bytes: result.elpx,
    filename: basename(path).replace(/\.h5p$/i, ".elpx")
  };
}
