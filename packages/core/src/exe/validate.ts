import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

export type ValidationIssue = { level: "error" | "warning"; message: string };
export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
  stats: { pages: number; iDevices: number; resources: number };
};

export async function validateElpx(data: Uint8Array): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];
  const stats = { pages: 0, iDevices: 0, resources: 0 };

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch (err) {
    return {
      ok: false,
      issues: [{ level: "error", message: `Not a valid ZIP: ${(err as Error).message}` }],
      stats
    };
  }

  // Prefer h5p2elpx's canonical content (present when we wrote the file or
  // when our writer injected it alongside a real eXe template).
  const contentXml = zip.file("h5p2elpx-content.xml") ?? zip.file("content.xml");
  if (!contentXml) {
    issues.push({ level: "error", message: "Missing content.xml (or h5p2elpx-content.xml)" });
    return { ok: false, issues, stats };
  }

  if (!zip.file("content.dtd")) {
    issues.push({ level: "warning", message: "Missing content.dtd" });
  }

  const xml = await contentXml.async("string");
  let parsed: any;
  try {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    parsed = parser.parse(xml);
  } catch (err) {
    issues.push({ level: "error", message: `content.xml is not well-formed: ${(err as Error).message}` });
    return { ok: false, issues, stats };
  }

  const project = parsed?.elpx?.project;
  if (!project) {
    issues.push({ level: "error", message: "content.xml has no <project> element" });
    return { ok: false, issues, stats };
  }
  const pages = toArray(project?.pages?.page);
  stats.pages = pages.length;
  if (pages.length === 0) {
    issues.push({ level: "error", message: "Project has no pages" });
  }

  const referencedPaths: string[] = [];
  for (const page of pages) {
    if (!page["@_id"]) issues.push({ level: "error", message: "Page missing id" });
    const blocks = toArray(page?.blocks?.block);
    for (const block of blocks) {
      if (!block["@_id"]) issues.push({ level: "error", message: "Block missing id" });
      const ideviceList = toArray(block?.iDevices?.iDevice);
      for (const idev of ideviceList) {
        stats.iDevices += 1;
        for (const k of ["@_id", "@_typeName", "@_order"]) {
          if (idev[k] === undefined) {
            issues.push({ level: "error", message: `iDevice missing ${k.slice(2)}` });
          }
        }
        if (idev.htmlView === undefined) {
          issues.push({ level: "error", message: "iDevice missing htmlView" });
        }
        if (idev.jsonProperties === undefined) {
          issues.push({ level: "error", message: "iDevice missing jsonProperties" });
        }
        const html = typeof idev.htmlView === "string" ? idev.htmlView : "";
        const m = html.match(/(?:src|href)="([^"]+)"/g);
        if (m) {
          for (const attr of m) {
            const v = attr.replace(/^[^"]*"|"$/g, "");
            if (v.startsWith("resources/") || v.startsWith("content/resources/")) {
              referencedPaths.push(v);
            }
          }
        }
      }
    }
  }

  const resourcePaths = new Set<string>();
  zip.forEach((p, f) => {
    if (!f.dir) resourcePaths.add(p);
    if (!f.dir && p.startsWith("content/resources/")) stats.resources += 1;
  });

  for (const ref of referencedPaths) {
    const candidates = [ref, `content/${ref}`];
    if (!candidates.some((c) => resourcePaths.has(c))) {
      issues.push({ level: "warning", message: `Referenced resource not found: ${ref}` });
    }
  }

  const ok = !issues.some((i) => i.level === "error");
  return { ok, issues, stats };
}

function toArray<T>(x: T | T[] | undefined): T[] {
  if (x === undefined) return [];
  return Array.isArray(x) ? x : [x];
}
