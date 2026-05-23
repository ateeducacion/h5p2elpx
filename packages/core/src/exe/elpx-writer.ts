import JSZip from "jszip";
import type { ElpxProject } from "./model.ts";
import { buildContentXml, CONTENT_DTD } from "./content-xml.ts";
import { loadTemplate } from "./template.ts";

export type WriteElpxOptions = {
  /**
   * Bytes of an eXeLearning `.elpx` to use as the base. The writer strips
   * the template's nav structures and rebuilds them from the project, but
   * keeps the template's theme/, libs/, html/, idevices/, index.html, etc.
   *
   * Strongly recommended — without it, the produced .elpx will not open
   * cleanly in eXeLearning (no theme, no idevice runtime). If omitted, the
   * writer falls back to a bare-bones ZIP containing only content.xml +
   * content.dtd + the project resources.
   */
  templateBytes?: Uint8Array;
  originalH5pPackages?: Array<{ name: string; data: Uint8Array }>;
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
