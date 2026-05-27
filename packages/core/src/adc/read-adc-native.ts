import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import type { AdcAsset, AdcComponent, AdcPackage } from "./types.ts";
import { basename } from "../utils/path.ts";
import { guessMime } from "../utils/mime.ts";

export type ReadAdcNativeOptions = {
  sourceFilename?: string;
};

/**
 * Minimal best-effort parser for the *native* Content/ADC export ZIP
 * (the one produced by the authoring tool when no LMS wrapper is selected).
 *
 * The native format stores each page as a separate XML file under
 * `data/<n>/lang/<lang>/<guion>.xml`. Those XMLs use the same 100+ tag
 * vocabulary as the altia JSON tree but in a verbose, document-shaped form.
 * Rather than re-implement the full grammar, we flatten each page into a
 * single rich-text iDevice — that already covers the dominant case (text
 * + image content) and keeps quizzes/interactives as an explicit follow-up.
 */
export async function readAdcNative(
  zip: JSZip,
  options: ReadAdcNativeOptions = {}
): Promise<AdcPackage> {
  const courseInfoFile = zip.file("courseInfo.xml");
  if (!courseInfoFile) throw new Error("ADC native bundle: missing courseInfo.xml");
  const courseInfoXml = await courseInfoFile.async("string");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: false,
    trimValues: true
  });
  const courseInfo = parser.parse(courseInfoXml) as { course?: Record<string, unknown> };
  const course = courseInfo.course ?? {};
  const title = pickString(course["name"]) ?? options.sourceFilename ?? "Imported ADC content";
  const language = pickString(course["language"]);

  const guions = await collectGuions(zip, parser);

  // Synthesise a flat component tree: a single `module` root with one
  // `pageContent` child per guion. Each pageContent has a single `text`
  // child carrying the concatenated rich-text excerpt from the XML.
  const components = new Map<string, AdcComponent>();
  const rootId = "adc-native-root";
  const moduleChildren: string[] = [];
  for (let i = 0; i < guions.length; i++) {
    const g = guions[i]!;
    const pageId = `adc-native-page-${i}`;
    const textId = `adc-native-text-${i}`;
    moduleChildren.push(pageId);
    components.set(pageId, {
      id: pageId,
      name: "pageContent",
      parent: rootId,
      properties: { titleHtml: g.title, title: g.title },
      resourceProperties: {},
      componentChildren: [textId]
    });
    components.set(textId, {
      id: textId,
      name: "text",
      parent: pageId,
      properties: { textContent: g.html },
      resourceProperties: {},
      componentChildren: []
    });
  }
  components.set(rootId, {
    id: rootId,
    name: "module",
    parent: null,
    properties: {},
    resourceProperties: {},
    componentChildren: moduleChildren
  });

  return {
    flavor: "native-content",
    title,
    language,
    components,
    rootId,
    assets: await collectAssets(zip),
    sourceFilename: options.sourceFilename
  };
}

type GuionPage = { title: string; html: string };

async function collectGuions(zip: JSZip, parser: XMLParser): Promise<GuionPage[]> {
  const xmlPaths: string[] = [];
  zip.forEach((path, file) => {
    if (!file.dir && /^data\/\d+\/lang\/[^/]+\/[^/]+\.xml$/.test(path)) {
      xmlPaths.push(path);
    }
  });
  xmlPaths.sort((a, b) => {
    const an = Number(a.split("/")[1] ?? 0);
    const bn = Number(b.split("/")[1] ?? 0);
    return an - bn;
  });
  const out: GuionPage[] = [];
  for (const path of xmlPaths) {
    const text = await zip.file(path)!.async("string");
    const parsed = parser.parse(text) as unknown;
    const page = extractGuionExcerpt(parsed);
    if (page) out.push(page);
  }
  return out;
}

function extractGuionExcerpt(parsed: unknown): GuionPage | null {
  const title =
    findFirstString(parsed, ["title1", "titleHtml", "title2Html", "title3Html"]) ?? "Page";
  const blobs: string[] = [];
  collectStrings(parsed, ["textContent", "title3Html", "titleHtml", "subtitleHtml"], blobs);
  if (blobs.length === 0) return null;
  // Dedupe consecutive duplicates and assemble as <p>…</p> blocks. Values are
  // already HTML-encoded by fast-xml-parser.
  const seen = new Set<string>();
  const html = blobs
    .filter((b) => {
      const k = b.trim();
      if (!k) return false;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .join("\n");
  return { title: stripHtml(title) || "Page", html };
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

function findFirstString(node: unknown, keys: string[]): string | undefined {
  if (!node || typeof node !== "object") return undefined;
  const obj = node as Record<string, unknown>;
  for (const k of keys) {
    const s = pickString(obj[k]);
    if (s && s.length > 0) return s;
  }
  for (const v of Object.values(obj)) {
    const s = findFirstString(v, keys);
    if (s) return s;
  }
  return undefined;
}

function collectStrings(node: unknown, keys: string[], out: string[]): void {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) collectStrings(item, keys, out);
    return;
  }
  if (typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  for (const [k, v] of Object.entries(obj)) {
    if (keys.includes(k)) {
      const s = pickString(v);
      if (s) out.push(s);
    } else {
      collectStrings(v, keys, out);
    }
  }
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
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
