import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import type { AdcAsset, AdcComponent, AdcPackage } from "./types.ts";
import { basename } from "../utils/path.ts";
import { guessMime } from "../utils/mime.ts";
import { decodeEntities } from "./entities.ts";
import { sanitizeProjectTitle } from "./read-adc-json.ts";

export type ReadAdcNativeOptions = {
  sourceFilename?: string;
};

/**
 * Parse the *native* ADC export ZIP (the one produced by the authoring tool
 * when no LMS wrapper is selected).
 *
 * Layout:
 *   - `courseInfo.xml` — top-level project metadata. Crucially it declares
 *     `<revision_id>` and `<guion>`: only the matching `data/N/` folder is
 *     the live revision; the other `data/<other-N>/` folders are historical
 *     revisions that look identical and must be skipped to avoid duplicating
 *     every page once per revision.
 *   - `data/<N>/rev.xml` — declares the revision id for that folder.
 *   - `data/<N>/lang/<lang>/<guion>.xml` — the entire module tree as nested
 *     XML. Each element with an `@id` attribute is a component, mirroring the
 *     altia JSON shape (`module`, `interface`, `pageBlock`, `pageContent`,
 *     `text`, `image`, `quiz`, …). We walk the tree into a flat
 *     `Map<id, AdcComponent>` so the rest of the converter can treat native
 *     and altia exports identically.
 */
export async function readAdcNative(
  zip: JSZip,
  options: ReadAdcNativeOptions = {}
): Promise<AdcPackage> {
  const courseInfoFile = zip.file("courseInfo.xml");
  if (!courseInfoFile) throw new Error("ADC native bundle: missing courseInfo.xml");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: false,
    trimValues: true,
    processEntities: true,
    htmlEntities: true,
    isArray: () => false
  });
  const courseInfoXml = await courseInfoFile.async("string");
  const courseInfo = parser.parse(courseInfoXml) as { course?: Record<string, unknown> };
  const course = courseInfo.course ?? {};
  const title = sanitizeProjectTitle(
    decodeEntities(pickString(course.name) ?? options.sourceFilename ?? "Imported ADC content")
  );
  const language = pickString(course.language);
  const guionId = pickString(course.guion);
  const revisionId = pickString(course.revision_id);

  const dataFolder = await pickActiveRevision(zip, revisionId);
  if (!dataFolder) throw new Error("ADC native bundle: no matching data/<N>/ revision");

  const guionPath = await findGuionXml(zip, dataFolder, language ?? "es", guionId);
  if (!guionPath) {
    throw new Error(`ADC native bundle: no guion XML under ${dataFolder}`);
  }
  const guionXml = await zip.file(guionPath)!.async("string");
  const parsed = parser.parse(guionXml) as Record<string, unknown>;

  const components = new Map<string, AdcComponent>();
  const rootId = walkRoot(parsed, components);
  if (!rootId) {
    throw new Error("ADC native bundle: no `module` element in guion XML");
  }

  return {
    flavor: "native",
    title,
    language,
    components,
    rootId,
    assets: await collectAssets(zip),
    sourceFilename: options.sourceFilename
  };
}

/** Iterate `data/<N>/rev.xml` and return the folder whose `<version><id>`
 *  matches `courseInfo.revision_id`. Falls back to the numerically highest
 *  folder when no revision id is declared. */
async function pickActiveRevision(zip: JSZip, revisionId?: string): Promise<string | null> {
  const folders = new Set<string>();
  zip.forEach((path, file) => {
    if (file.dir) return;
    const m = path.match(/^(data\/\d+)\//);
    if (m) folders.add(m[1]!);
  });
  if (folders.size === 0) return null;
  if (revisionId) {
    for (const folder of folders) {
      const revFile = zip.file(`${folder}/rev.xml`);
      if (!revFile) continue;
      const rev = await revFile.async("string");
      const m = rev.match(/<id>([^<]+)<\/id>/);
      if (m && m[1] === revisionId) return folder;
    }
  }
  // Fall back to the highest-numbered folder (newest revision when ids align
  // with creation order — typical case in the authoring tool).
  return [...folders].sort((a, b) => Number(b.split("/")[1]) - Number(a.split("/")[1]))[0] ?? null;
}

/** Locate `<dataFolder>/lang/<lang>/<guionId>.xml` (falling back to the first
 *  XML under `lang/<lang>/` if the named guion isn't there, then to any
 *  language). */
async function findGuionXml(
  zip: JSZip,
  dataFolder: string,
  lang: string,
  guionId?: string
): Promise<string | null> {
  if (guionId) {
    const direct = `${dataFolder}/lang/${lang}/${guionId}.xml`;
    if (zip.file(direct)) return direct;
  }
  const candidates: string[] = [];
  zip.forEach((path, file) => {
    if (!file.dir && path.startsWith(`${dataFolder}/lang/`) && path.endsWith(".xml")) {
      candidates.push(path);
    }
  });
  if (candidates.length === 0) return null;
  // Prefer the requested language.
  const preferred = candidates.filter((p) => p.includes(`/lang/${lang}/`));
  return preferred[0] ?? candidates[0] ?? null;
}

function walkRoot(
  parsedXml: Record<string, unknown>,
  components: Map<string, AdcComponent>
): string | null {
  for (const [name, value] of Object.entries(parsedXml)) {
    if (name.startsWith("?")) continue; // skip <?xml ?> declaration
    const id = walkComponent(name, value, null, components);
    if (id) return id;
  }
  return null;
}

/**
 * Walk one XML node into the flat component map.
 *
 * - Object with `@_id` → component. Its scalar/string children are flattened
 *   into `properties`; child objects with `@_id` recurse and their ids land
 *   in `componentChildren`.
 * - Array → each element is walked individually (multi-occurrence siblings
 *   like a `pageBlock` carrying 6 `pageContent` entries).
 * - Anything else (bare string / number) is ignored at this level — those
 *   are picked up as properties by the parent.
 */
function walkComponent(
  name: string,
  value: unknown,
  parentId: string | null,
  components: Map<string, AdcComponent>
): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return null;
  }
  if (Array.isArray(value)) {
    // The caller will only ever see arrays for *child* elements, where we
    // need to add every item as a sibling component but only return one id.
    // We add all, the caller already pushes ids one by one — see walkProps.
    return null;
  }
  const obj = value as Record<string, unknown>;
  const idAttr = obj["@_id"];
  if (!idAttr || typeof idAttr !== "string") {
    // No id — treat as a property carrier of the parent (handled in walkProps).
    return null;
  }
  const id = idAttr;
  if (components.has(id)) {
    // Should be rare; the authoring tool seems to ensure unique ids.
    return id;
  }
  const properties: Record<string, string> = {};
  const componentChildren: string[] = [];
  walkProps(obj, id, properties, componentChildren, components);
  components.set(id, {
    id,
    name,
    parent: parentId,
    properties,
    resourceProperties: {},
    componentChildren
  });
  return id;
}

function walkProps(
  obj: Record<string, unknown>,
  selfId: string,
  properties: Record<string, string>,
  componentChildren: string[],
  components: Map<string, AdcComponent>
): void {
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith("@_")) continue;
    if (v === null || v === undefined) continue;
    if (typeof v === "string") {
      properties[k] = decodeEntities(v);
      continue;
    }
    if (typeof v === "number" || typeof v === "boolean") {
      properties[k] = String(v);
      continue;
    }
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item && typeof item === "object" && "@_id" in (item as Record<string, unknown>)) {
          const cid = walkComponent(k, item, selfId, components);
          if (cid) componentChildren.push(cid);
        } else if (typeof item === "string") {
          properties[k] = (properties[k] ? `${properties[k]} ` : "") + decodeEntities(item);
        }
      }
      continue;
    }
    if (typeof v === "object") {
      const childObj = v as Record<string, unknown>;
      if ("@_id" in childObj) {
        const cid = walkComponent(k, childObj, selfId, components);
        if (cid) componentChildren.push(cid);
      } else if ("#text" in childObj && typeof childObj["#text"] === "string") {
        properties[k] = decodeEntities(childObj["#text"] as string);
      }
      // else: ignore nested object without id and without text
    }
  }
}

function pickString(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (
    v &&
    typeof v === "object" &&
    "#text" in v &&
    typeof (v as { "#text": unknown })["#text"] === "string"
  ) {
    return (v as { "#text": string })["#text"];
  }
  return undefined;
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
