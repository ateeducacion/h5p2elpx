import type { ElpxProject } from "./model.ts";
import { buildContentXml, CONTENT_DTD } from "./content-xml.ts";
import { loadTemplate } from "./template.ts";
import { DEFAULT_SCREENSHOT_PNG } from "./assets/default-screenshot.ts";
import { buildExportHtmlFiles } from "./html-export.ts";

/** Iterate every iDevice typeName that appears in the project. */
function collectUsedIdeviceTypes(project: ElpxProject): Set<string> {
  const out = new Set<string>();
  for (const page of project.pages) {
    for (const block of page.blocks) {
      for (const idev of block.iDevices) out.add(idev.typeName);
    }
  }
  return out;
}

/**
 * Drop every `idevices/<X>/...` entry whose X isn't in `keep`. The
 * template we clone ships all ~43 iDevice runtimes (~4 MB); a real
 * conversion usually only uses 2–5 of them, so this saves ~3 MB
 * uncompressed on a typical .elpx and matches what eXeLearning does
 * itself on export.
 */
function pruneIdevices(zip: Awaited<ReturnType<typeof loadTemplate>>, keep: Set<string>) {
  const toRemove: string[] = [];
  zip.forEach((path, file) => {
    if (file.dir) return;
    const m = path.match(/^idevices\/([^/]+)\//);
    if (m && !keep.has(m[1]!)) toRemove.push(path);
  });
  for (const p of toRemove) zip.remove(p);
}

export type WriteElpxOptions = {
  /**
   * Bytes of an eXeLearning `.elpx` to use as the base. The writer strips
   * the template's nav structures and rebuilds them from the project, but
   * keeps the template's theme/, libs/, html/, idevices/, index.html, etc.
   *
   * Strongly recommended — without it, the produced .elpx will not open
   * cleanly in eXeLearning (no theme, no idevice runtime). If omitted, the
   * writer falls back to a bare-bones ZIP containing only content.xml +
   * content.dtd + screenshot.png + the project resources.
   */
  templateBytes?: Uint8Array;
  originalH5pPackages?: Array<{ name: string; data: Uint8Array }>;
  /** Custom screenshot.png bytes (PNG required). Defaults to a 1×1 placeholder. */
  screenshotBytes?: Uint8Array;
};

export async function writeElpx(
  project: ElpxProject,
  options: WriteElpxOptions = {}
): Promise<Uint8Array> {
  const zip = await loadTemplate(options.templateBytes);

  // Always overwrite content.xml + content.dtd with our generated ones —
  // the template's nav structures don't apply to the converted project.
  const xml = buildContentXml(project);
  zip.file("content.xml", xml);
  zip.file("content.dtd", CONTENT_DTD);

  clearGeneratedHtml(zip);
  for (const file of buildExportHtmlFiles(project)) {
    zip.file(file.path, file.contents);
  }

  // Ship only the iDevice runtimes that actually appear in the project.
  pruneIdevices(zip, collectUsedIdeviceTypes(project));

  // Always ensure a root-level screenshot.png exists. eXeLearning v4
  // requires the first 8 bytes to be the PNG magic signature.
  if (!zip.file("screenshot.png")) {
    zip.file("screenshot.png", options.screenshotBytes ?? DEFAULT_SCREENSHOT_PNG);
  } else if (options.screenshotBytes) {
    zip.file("screenshot.png", options.screenshotBytes);
  }

  for (const res of project.resources) {
    zip.file(res.path, res.data);
  }

  if (options.originalH5pPackages) {
    for (const { name, data } of options.originalH5pPackages) {
      zip.file(`content/resources/original/${name}`, data);
    }
  }

  return await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
}

function clearGeneratedHtml(zip: Awaited<ReturnType<typeof loadTemplate>>) {
  zip.remove("index.html");
  zip.remove("search_index.js");
  zip.remove("libs/elpx-manifest.js");
  zip.forEach((path, file) => {
    if (!file.dir && /^html\/[^/]+\.html$/i.test(path)) {
      zip.remove(path);
    }
  });
}
