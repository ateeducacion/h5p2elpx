import JSZip from "jszip";
import type { AdcAsset, AdcComponent, AdcFlavor, AdcPackage } from "./types.ts";
import { basename } from "../utils/path.ts";
import { guessMime } from "../utils/mime.ts";
import { decompressNtxCaf, extractNtxCafBase64 } from "./decompress-ntxcaf.ts";

export type ReadAdcAltiaOptions = {
  sourceFilename?: string;
  flavor: AdcFlavor;
};

/**
 * Parse an altia-flavoured Content/ADC bundle (zip/scorm12/scorm2004/xapi/local).
 * All five variants ship the same authoring payload — they differ only in the
 * tracking manifest wrapper. Prefers `project.json` when present; otherwise
 * falls back to deobfuscating `var ntxCafCompressed` from `index.html`.
 */
export async function readAdcAltia(zip: JSZip, options: ReadAdcAltiaOptions): Promise<AdcPackage> {
  const projectRaw = await readProjectJson(zip);
  const langKey = pickLanguage(projectRaw);
  const lang = projectRaw[langKey] as Record<string, unknown>;

  const title = readProjectTitle(lang) ?? options.sourceFilename ?? "Imported ADC content";
  const componentsRaw = (lang.components ?? {}) as Record<string, AdcComponent>;
  const components = new Map<string, AdcComponent>();
  for (const [id, comp] of Object.entries(componentsRaw)) {
    components.set(id, normalizeComponent(id, comp));
  }
  const rootId = findRootModule(components);
  const assets = await collectAssets(zip);

  return {
    flavor: options.flavor,
    title,
    language: langKey,
    components,
    rootId,
    assets,
    sourceFilename: options.sourceFilename
  };
}

async function readProjectJson(zip: JSZip): Promise<Record<string, unknown>> {
  const projFile = zip.file("project.json");
  if (projFile) {
    return JSON.parse(await projFile.async("string")) as Record<string, unknown>;
  }
  const indexHtmlFile = zip.file("index.html");
  if (!indexHtmlFile) {
    throw new Error("ADC altia bundle: missing project.json and index.html");
  }
  const html = await indexHtmlFile.async("string");
  const b64 = extractNtxCafBase64(html);
  if (!b64) {
    throw new Error("ADC altia bundle: no project.json and no ntxCafCompressed blob");
  }
  const ntx = (await decompressNtxCaf(b64)) as { ntxdat?: { projectDataCollection?: unknown } };
  const collection = ntx.ntxdat?.projectDataCollection;
  if (!collection || typeof collection !== "object") {
    throw new Error("ADC altia bundle: ntxCafCompressed did not unpack to a projectDataCollection");
  }
  return collection as Record<string, unknown>;
}

function pickLanguage(project: Record<string, unknown>): string {
  const keys = Object.keys(project);
  // Most ADC packages are single-language ("es"). When multiple are present,
  // prefer Spanish, then English, otherwise the first declared.
  if (keys.includes("es")) return "es";
  if (keys.includes("en")) return "en";
  return keys[0] ?? "es";
}

function readProjectTitle(lang: Record<string, unknown>): string | undefined {
  const project = lang.project as { titles?: Record<string, string>; name?: string } | undefined;
  if (!project) return undefined;
  if (project.titles) {
    const first = Object.values(project.titles).find((v) => typeof v === "string" && v.length > 0);
    if (first) return first;
  }
  return project.name;
}

function normalizeComponent(id: string, raw: AdcComponent): AdcComponent {
  return {
    id,
    name: raw.name,
    parent: (raw as { parent?: string | null }).parent ?? null,
    properties: (raw.properties ?? {}) as Record<string, unknown>,
    resourceProperties: (raw.resourceProperties ?? {}) as AdcComponent["resourceProperties"],
    htmlResourceProperties: raw.htmlResourceProperties,
    componentChildren: (raw.componentChildren ?? []) as string[]
  };
}

function findRootModule(components: Map<string, AdcComponent>): string {
  for (const [id, c] of components) {
    if (c.name === "module" && (!c.parent || c.parent === "")) return id;
  }
  for (const [id, c] of components) if (c.name === "module") return id;
  throw new Error("ADC altia bundle: no `module` component found");
}

async function collectAssets(zip: JSZip): Promise<AdcAsset[]> {
  const out: AdcAsset[] = [];
  const entries: Array<{ path: string; file: JSZip.JSZipObject }> = [];
  zip.forEach((path, file) => {
    if (!file.dir && path.startsWith("resources/")) entries.push({ path, file });
  });
  for (const { path, file } of entries) {
    const data = new Uint8Array(await file.async("arraybuffer"));
    out.push({ path, filename: basename(path), data, mimeType: guessMime(path) });
  }
  return out;
}
