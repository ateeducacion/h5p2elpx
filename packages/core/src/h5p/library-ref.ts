import type { H5PLibraryRef } from "./h5p-types.ts";

/**
 * Parse a library reference string like `H5P.CoursePresentation 1.26` or
 * `H5P.MultiChoice-1.16` into a structured ref.
 */
export function parseLibraryRef(input: string): H5PLibraryRef {
  const trimmed = input.trim();
  const match = trimmed.match(/^([A-Za-z0-9_.]+)[\s-]?(\d+)?\.?(\d+)?\.?(\d+)?$/);
  if (!match) return { machineName: trimmed };
  const [, name, major, minor, patch] = match;
  return {
    machineName: name!,
    majorVersion: major ? Number(major) : undefined,
    minorVersion: minor ? Number(minor) : undefined,
    patchVersion: patch ? Number(patch) : undefined
  };
}

export function libraryRefString(ref: H5PLibraryRef): string {
  const v = [ref.majorVersion, ref.minorVersion, ref.patchVersion]
    .filter((n) => n !== undefined)
    .join(".");
  return v ? `${ref.machineName} ${v}` : ref.machineName;
}

/** Drop versioning to a bare machine name for adapter lookup. */
export function machineNameOnly(input: string | H5PLibraryRef): string {
  if (typeof input === "string") return parseLibraryRef(input).machineName;
  return input.machineName;
}
