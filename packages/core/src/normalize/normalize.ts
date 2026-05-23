import type { H5PPackage } from "../h5p/h5p-types.ts";
import type { NormalizedNode } from "./nodes.ts";
import { adaptH5pSubContent } from "./adapters/index.ts";
import { libraryRefString } from "../h5p/library-ref.ts";

export function normalizePackage(pkg: H5PPackage): NormalizedNode {
  return adaptH5pSubContent(libraryRefString(pkg.mainLibrary), pkg.contentJson);
}
