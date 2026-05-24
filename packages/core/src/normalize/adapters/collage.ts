import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.Collage";

/** H5P.Collage content.json: { collage: { template, options:{spacing,heightAdjustment,frame}, clips: [{ image:{path}, offset:{}, scale, alt }] } } */
export function adapt(content: any): NormalizedNode {
  const clips: any[] = Array.isArray(content?.collage?.clips) ? content.collage.clips : [];
  const items = clips
    .map((c) => {
      const path = c?.image?.path;
      const alt = c?.alt ?? "";
      return typeof path === "string" ? `<img src="${path}" alt="${alt}" />` : "";
    })
    .filter(Boolean)
    .join("\n");
  return {
    id: uniqueId("col"),
    sourceType: machineName,
    kind: "text",
    html: `<div class="h5p2elpx-collage">${items || "(empty)"}</div>`
  };
}
