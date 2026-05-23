import JSZip from "jszip";
import type { H5PAsset, H5PPackage } from "./h5p-types.ts";
import { parseH5pJson } from "./parse-h5p-json.ts";
import { parseContentJson } from "./parse-content-json.ts";
import { detectMainLibrary } from "./detect-library.ts";
import { basename } from "../utils/path.ts";
import { guessMime } from "../utils/mime.ts";

export type ReadH5pOptions = {
  sourceFilename?: string;
  keepRawH5p?: boolean;
};

export async function readH5p(
  data: Uint8Array | ArrayBuffer,
  options: ReadH5pOptions = {}
): Promise<H5PPackage> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const zip = await JSZip.loadAsync(bytes);

  const h5pJsonFile = zip.file("h5p.json");
  if (!h5pJsonFile) {
    throw new Error("Invalid H5P package: missing h5p.json");
  }
  const h5pJsonText = await h5pJsonFile.async("string");
  const parsed = parseH5pJson(JSON.parse(h5pJsonText));

  const contentJsonFile = zip.file("content/content.json");
  if (!contentJsonFile) {
    throw new Error("Invalid H5P package: missing content/content.json");
  }
  const contentJson = parseContentJson(await contentJsonFile.async("string"));

  const rawFiles = new Map<string, Uint8Array>();
  const assets: H5PAsset[] = [];

  const entries: Array<{ path: string; file: JSZip.JSZipObject }> = [];
  zip.forEach((path, file) => {
    if (!file.dir) entries.push({ path, file });
  });

  for (const { path, file } of entries) {
    const u8 = new Uint8Array(await file.async("arraybuffer"));
    rawFiles.set(path, u8);
    if (path.startsWith("content/") && path !== "content/content.json") {
      assets.push({
        path,
        filename: basename(path),
        mimeType: guessMime(path),
        data: u8
      });
    }
  }

  const mainLibrary = detectMainLibrary(parsed.mainLibraryName, parsed.preloadedDependencies);

  const pkg: H5PPackage = {
    title: parsed.title,
    language: parsed.language,
    mainLibrary,
    dependencies: parsed.preloadedDependencies,
    contentJson,
    assets,
    rawFiles,
    sourceFilename: options.sourceFilename
  };
  if (options.keepRawH5p) pkg.rawH5p = bytes;
  return pkg;
}
