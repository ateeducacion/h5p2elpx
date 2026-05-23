import { readFile } from "node:fs/promises";
import { readH5p, libraryRefString, listRegisteredMachines } from "@h5p2elpx/core";

export async function runInspect(input: string): Promise<void> {
  const bytes = new Uint8Array(await readFile(input));
  const pkg = await readH5p(bytes, { sourceFilename: input });
  const supported = new Set(listRegisteredMachines());
  console.log(`Title:        ${pkg.title}`);
  console.log(`Language:     ${pkg.language ?? "(unspecified)"}`);
  console.log(`Main library: ${libraryRefString(pkg.mainLibrary)}`);
  console.log(
    `Supported:    ${supported.has(pkg.mainLibrary.machineName) ? "yes" : "no (will use fallback)"}`
  );
  console.log(`Assets:       ${pkg.assets.length}`);
  console.log("Dependencies:");
  for (const d of pkg.dependencies) {
    console.log(
      `  - ${libraryRefString(d)}${supported.has(d.machineName) ? "" : "  (no adapter)"}`
    );
  }
}
