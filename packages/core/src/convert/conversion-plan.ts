import type { H5PPackage } from "../h5p/h5p-types.ts";
import { libraryRefString } from "../h5p/library-ref.ts";
import { listRegisteredMachines } from "../normalize/adapters/index.ts";

export type CompatibilityEntry = {
  sourceFile: string;
  title: string;
  mainLibrary: string;
  supported: boolean;
};

export function buildCompatibilityPreview(packages: H5PPackage[]): CompatibilityEntry[] {
  const supported = new Set(listRegisteredMachines());
  return packages.map((p) => ({
    sourceFile: p.sourceFilename ?? "package.h5p",
    title: p.title,
    mainLibrary: libraryRefString(p.mainLibrary),
    supported: supported.has(p.mainLibrary.machineName)
  }));
}
