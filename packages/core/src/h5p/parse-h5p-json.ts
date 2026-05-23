import { z } from "zod";
import type { H5PLibraryRef } from "./h5p-types.ts";

const libRefSchema = z.object({
  machineName: z.string(),
  majorVersion: z.union([z.number(), z.string()]).optional(),
  minorVersion: z.union([z.number(), z.string()]).optional(),
  patchVersion: z.union([z.number(), z.string()]).optional()
});

const h5pJsonSchema = z
  .object({
    title: z.string().optional(),
    language: z.string().optional(),
    mainLibrary: z.string().optional(),
    preloadedDependencies: z.array(libRefSchema).optional(),
    embedTypes: z.array(z.string()).optional(),
    license: z.string().optional(),
    authors: z.array(z.unknown()).optional()
  })
  .passthrough();

export type ParsedH5PJson = {
  title: string;
  language?: string;
  mainLibraryName?: string;
  preloadedDependencies: H5PLibraryRef[];
  raw: unknown;
};

function toNumber(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function parseH5pJson(json: unknown): ParsedH5PJson {
  const parsed = h5pJsonSchema.parse(json);
  return {
    title: parsed.title ?? "Untitled H5P",
    language: parsed.language,
    mainLibraryName: parsed.mainLibrary,
    preloadedDependencies: (parsed.preloadedDependencies ?? []).map((d) => ({
      machineName: d.machineName,
      majorVersion: toNumber(d.majorVersion),
      minorVersion: toNumber(d.minorVersion),
      patchVersion: toNumber(d.patchVersion)
    })),
    raw: json
  };
}
