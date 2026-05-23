import JSZip from "jszip";

export type H5pFixtureInput = {
  title?: string;
  language?: string;
  mainLibrary: string;
  preloadedDependencies?: Array<{ machineName: string; majorVersion: number; minorVersion: number }>;
  content: unknown;
  /** path → bytes (under content/, e.g. `content/images/photo.png`) */
  extras?: Record<string, Uint8Array>;
};

export async function makeH5pZip(input: H5pFixtureInput): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    "h5p.json",
    JSON.stringify({
      title: input.title ?? "Test",
      language: input.language ?? "en",
      mainLibrary: input.mainLibrary,
      preloadedDependencies: input.preloadedDependencies ?? [
        { machineName: input.mainLibrary, majorVersion: 1, minorVersion: 0 }
      ],
      embedTypes: ["div"]
    })
  );
  zip.file("content/content.json", JSON.stringify(input.content));
  if (input.extras) {
    for (const [path, data] of Object.entries(input.extras)) {
      zip.file(path, data);
    }
  }
  return new Uint8Array(await zip.generateAsync({ type: "uint8array" }));
}
