import JSZip from "jszip";
import type { ElpxProject } from "./model.ts";
import { buildContentXml, CONTENT_DTD } from "./content-xml.ts";
import { loadTemplate } from "./template.ts";

export type WriteElpxOptions = {
  templateBytes?: Uint8Array;
  originalH5pPackages?: Array<{ name: string; data: Uint8Array }>;
};

export async function writeElpx(
  project: ElpxProject,
  options: WriteElpxOptions = {}
): Promise<Uint8Array> {
  const zip = await loadTemplate(options.templateBytes);

  // h5p2elpx-content.xml is our canonical model export; if no real eXe
  // template was provided we also write `content.xml`+`content.dtd` at the
  // root so the package validates as a stand-alone elpx.
  const xml = buildContentXml(project);
  const hasRealTemplate = !!(options.templateBytes && options.templateBytes.byteLength > 0);

  zip.file("h5p2elpx-content.xml", xml);
  if (!hasRealTemplate) {
    zip.file("content.xml", xml);
    zip.file("content.dtd", CONTENT_DTD);
  }

  for (const res of project.resources) {
    zip.file(res.path, res.data);
  }

  if (options.originalH5pPackages) {
    for (const { name, data } of options.originalH5pPackages) {
      zip.file(`content/resources/original/${name}`, data);
    }
  }

  const out = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
  return out;
}
