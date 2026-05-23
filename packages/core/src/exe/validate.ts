import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

export type ValidationIssue = { level: "error" | "warning"; message: string };
export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
  stats: { pages: number; iDevices: number; resources: number };
};

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

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
  if (!zip.file("index.html")) {
    issues.push({ level: "warning", message: "Missing index.html" });
  }
  const screenshot = zip.file("screenshot.png");
  if (!screenshot) {
    issues.push({ level: "warning", message: "Missing screenshot.png" });
  } else {
    const bytes = new Uint8Array(await screenshot.async("arraybuffer"));
    const magicOk = PNG_MAGIC.every((b, i) => bytes[i] === b);
    if (!magicOk) {
      issues.push({ level: "error", message: "screenshot.png is not a valid PNG (magic bytes)" });
    }
  }

  const xml = await contentXml.async("string");
  let parsed: any;
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
    parsed = parser.parse(xml);
  } catch (err) {
    issues.push({
      level: "error",
      message: `content.xml is not well-formed: ${(err as Error).message}`
    });
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
  const pageIds = new Set<string>();
  for (const page of navStructures) {
    if (!page.odePageId) {
      issues.push({ level: "error", message: "Page missing odePageId" });
      continue;
    }
    pageIds.add(String(page.odePageId));
    const pagStructures = toArray(page?.odePagStructures?.odePagStructure);
    for (const block of pagStructures) {
      if (!block.odeBlockId) {
        issues.push({ level: "error", message: "Block missing odeBlockId" });
      }
      if (String(block.odePageId) !== String(page.odePageId)) {
        issues.push({
          level: "error",
          message: `Block odePageId ${block.odePageId} does not match parent page ${page.odePageId} (lockstep)`
        });
      }
      const components = toArray(block?.odeComponents?.odeComponent);
      for (const comp of components) {
        stats.iDevices += 1;
        for (const k of ["odePageId", "odeBlockId", "odeIdeviceId", "odeIdeviceTypeName"]) {
          if (comp[k] === undefined || comp[k] === "") {
            issues.push({ level: "error", message: `iDevice missing ${k}` });
          }
        }
        if (String(comp.odePageId) !== String(page.odePageId)) {
          issues.push({
            level: "error",
            message: `Component odePageId ${comp.odePageId} does not match parent page ${page.odePageId} (lockstep)`
          });
        }
        if (String(comp.odeBlockId) !== String(block.odeBlockId)) {
          issues.push({
            level: "error",
            message: `Component odeBlockId ${comp.odeBlockId} does not match parent block ${block.odeBlockId} (lockstep)`
          });
        }
        if (comp.odeComponentsOrder === undefined) {
          issues.push({ level: "error", message: "iDevice missing odeComponentsOrder" });
        }
        const html = typeof comp.htmlView === "string" ? comp.htmlView : "";
        const jsonProps =
          typeof comp.jsonProperties === "string" ? comp.jsonProperties : "";
        // collect referenced asset paths from both htmlView (relative) and
        // jsonProperties ({{context_path}}/...)
        for (const attr of html.match(/(?:src|href|poster)="([^"]+)"/g) ?? []) {
          const v = attr.replace(/^[^"]*"|"$/g, "");
          if (v.startsWith("content/resources/")) referencedPaths.push(v);
        }
        for (const m of jsonProps.matchAll(/\{\{context_path\}\}\/([^"'\s)]+)/g)) {
          referencedPaths.push(`content/resources/${m[1]}`);
        }
      }
    }
  }

  // Validate parent-page references
  for (const page of navStructures) {
    const parent = String(page.odeParentPageId ?? "");
    if (parent && !pageIds.has(parent)) {
      issues.push({
        level: "warning",
        message: `Page ${page.odePageId} has odeParentPageId ${parent} but no such page exists`
      });
    }
  }

  const resourcePaths = new Set<string>();
  zip.forEach((p, f) => {
    if (!f.dir) resourcePaths.add(p);
    if (!f.dir && p.startsWith("content/resources/")) stats.resources += 1;
  });

  for (const ref of new Set(referencedPaths)) {
    if (!resourcePaths.has(ref)) {
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
