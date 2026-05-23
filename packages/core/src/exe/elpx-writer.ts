import JSZip from "jszip";
import type { ElpxProject } from "./model.ts";
import { buildContentXml, CONTENT_DTD } from "./content-xml.ts";
import { loadTemplate } from "./template.ts";
import { DEFAULT_SCREENSHOT_PNG } from "./assets/default-screenshot.ts";

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

  // Always ensure a root-level screenshot.png exists. eXeLearning v4
  // requires the first 8 bytes to be the PNG magic signature.
  if (!zip.file("screenshot.png")) {
    zip.file("screenshot.png", options.screenshotBytes ?? DEFAULT_SCREENSHOT_PNG);
  } else if (options.screenshotBytes) {
    zip.file("screenshot.png", options.screenshotBytes);
  }

  // Ensure a placeholder index.html exists. eXeLearning regenerates the
  // real one on import.
  if (!zip.file("index.html")) {
    zip.file(
      "index.html",
      `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${escapeHtml(
        project.title
      )}</title></head><body><h1>${escapeHtml(
        project.title
      )}</h1><p>Open this <code>.elpx</code> in eXeLearning.</p></body></html>`
    );
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

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
