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
  // Match both files (`idevices/X/...`) and the bare dir entry (`idevices/X/`)
  // so we don't leave ghost folder records in the ZIP listing.
  zip.forEach((path) => {
    const m = path.match(/^idevices\/([^/]+)(?:\/|$)/);
    if (m && !keep.has(m[1]!)) toRemove.push(path);
  });
  for (const p of toRemove) zip.remove(p);
}

/**
 * Swap the active theme by copying every file from `themes/<name>/...`
 * to `theme/...`, then removing the entire `themes/` staging area.
 * Falls back to a no-op when the template doesn't stage the requested
 * theme (i.e. the template was built single-theme).
 */
async function applyTheme(
  zip: Awaited<ReturnType<typeof loadTemplate>>,
  themeName: string
): Promise<boolean> {
  const stagingPrefix = `themes/${themeName}/`;
  const stagedPaths: string[] = [];
  zip.forEach((path, file) => {
    if (!file.dir && path.startsWith(stagingPrefix)) stagedPaths.push(path);
  });
  if (stagedPaths.length === 0) return false;

  // Wipe the current theme/ dir and copy the chosen one over.
  const currentThemePaths: string[] = [];
  zip.forEach((path, file) => {
    if (!file.dir && path.startsWith("theme/")) currentThemePaths.push(path);
  });
  for (const p of currentThemePaths) zip.remove(p);

  for (const src of stagedPaths) {
    const rel = src.slice(stagingPrefix.length);
    const data = await zip.file(src)!.async("uint8array");
    zip.file(`theme/${rel}`, data);
  }
  // Drop the entire themes/ staging dir — no need to ship the
  // unselected themes.
  const stagingToRemove: string[] = [];
  zip.forEach((path, file) => {
    if (!file.dir && path.startsWith("themes/")) stagingToRemove.push(path);
  });
  for (const p of stagingToRemove) zip.remove(p);
  return true;
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
  /** Theme to apply (must be staged under themes/<name>/ in the template). */
  theme?: string;
  /** Generate search_index.js and link it from pages. Default true. */
  enableSearch?: boolean;
  /** Add MathJax v3 CDN script tag to pages. Default false. */
  enableMathJax?: boolean;
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
  for (const file of buildExportHtmlFiles(project, {
    enableSearch: options.enableSearch,
    enableMathJax: options.enableMathJax
  })) {
    zip.file(file.path, file.contents);
  }

  // Ship only the iDevice runtimes that actually appear in the project.
  pruneIdevices(zip, collectUsedIdeviceTypes(project));

  // Apply chosen theme (if the template stages multiple). Always drop
  // the themes/ staging dir so it doesn't ship unselected themes.
  if (options.theme) await applyTheme(zip, options.theme);
  await dropThemesStagingIfPresent(zip);

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

async function dropThemesStagingIfPresent(
  zip: Awaited<ReturnType<typeof loadTemplate>>
): Promise<void> {
  const stagingPaths: string[] = [];
  zip.forEach((path) => {
    if (path.startsWith("themes/")) stagingPaths.push(path);
  });
  for (const p of stagingPaths) zip.remove(p);
}
