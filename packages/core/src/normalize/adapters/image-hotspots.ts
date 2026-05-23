import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.ImageHotspots";

export function adapt(content: any): NormalizedNode {
  const imgPath = typeof content?.image?.path === "string" ? content.image.path : "";
  const hotspots: any[] = Array.isArray(content?.hotspots) ? content.hotspots : [];
  const list = hotspots
    .map((h) => {
      const title = h?.header ?? "(hotspot)";
      const body = Array.isArray(h?.content)
        ? h.content
            .map((c: any) => (typeof c?.action?.params?.text === "string" ? c.action.params.text : ""))
            .join("\n")
        : "";
      return `<li><strong>${title}</strong><div>${body}</div></li>`;
    })
    .join("\n");
  const html = `<figure><img src="${imgPath}" alt="" /></figure><ol class="h5p2elpx-hotspots">${list}</ol>`;
  return {
    id: uniqueId("hs"),
    sourceType: machineName,
    kind: "text",
    html
  };
}
