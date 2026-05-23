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

  const contentXml = zip.file("content.xml");
  if (!contentXml) {
    issues.push({ level: "error", message: "Missing content.xml" });
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

  const root = parsed?.ode;
  if (!root) {
    issues.push({ level: "error", message: "content.xml has no <ode> root element" });
    return { ok: false, issues, stats };
  }

  const navStructures = toArray(root?.odeNavStructures?.odeNavStructure);
  stats.pages = navStructures.length;
  if (navStructures.length === 0) {
    issues.push({ level: "error", message: "Project has no pages (odeNavStructures is empty)" });
  }

  const referencedPaths: string[] = [];
  for (const page of navStructures) {
    if (!page.odePageId) {
      issues.push({ level: "error", message: "Page missing odePageId" });
    }
    const pagStructures = toArray(page?.odePagStructures?.odePagStructure);
    for (const block of pagStructures) {
      if (!block.odeBlockId) {
        issues.push({ level: "error", message: "Block missing odeBlockId" });
      }
      const components = toArray(block?.odeComponents?.odeComponent);
      for (const comp of components) {
        stats.iDevices += 1;
        for (const k of ["odePageId", "odeBlockId", "odeIdeviceId", "odeIdeviceTypeName"]) {
          if (comp[k] === undefined || comp[k] === "") {
            issues.push({ level: "error", message: `iDevice missing ${k}` });
          }
        }
        if (comp.odeComponentsOrder === undefined) {
          issues.push({ level: "error", message: "iDevice missing odeComponentsOrder" });
        }
        if (comp.htmlView === undefined) {
          issues.push({ level: "warning", message: "iDevice missing htmlView" });
        }
        if (comp.jsonProperties === undefined) {
          issues.push({ level: "warning", message: "iDevice missing jsonProperties" });
        }
        const html = typeof comp.htmlView === "string" ? comp.htmlView : "";
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
