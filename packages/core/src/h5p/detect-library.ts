import type { H5PLibraryRef } from "./h5p-types.ts";
import { parseLibraryRef } from "./library-ref.ts";

/**
 * Detect the main H5P library for a package.
 * Priority:
 *   1. `mainLibrary` field of h5p.json, matched against preloadedDependencies
 *      (so we get version info too).
 *   2. The first preloaded dependency whose machineName matches `mainLibrary`.
 *   3. The first preloaded dependency.
 *   4. Fallback `H5P.Unknown` if there is literally nothing else.
 */
export function detectMainLibrary(
  mainLibraryName: string | undefined,
  preloadedDependencies: H5PLibraryRef[]
): H5PLibraryRef {
  if (mainLibraryName) {
    const matched = preloadedDependencies.find((d) => d.machineName === mainLibraryName);
    if (matched) return matched;
    return parseLibraryRef(mainLibraryName);
  }
  if (preloadedDependencies[0]) return preloadedDependencies[0];
  return { machineName: "H5P.Unknown" };
}
