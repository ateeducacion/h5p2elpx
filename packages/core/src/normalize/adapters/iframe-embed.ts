import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.IFrameEmbed";

function parsePixels(v: unknown, fallback: number): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const m = v.match(/(\d+)/);
    if (m) return Number(m[1]);
  }
  return fallback;
}

/** H5P.IFrameEmbed content.json: { source: "url-or-local-file", width, height, minWidth, resizeSupported } */
export function adapt(content: any): NormalizedNode {
  const src = typeof content?.source === "string" ? content.source : "";
  return {
    id: uniqueId("ife"),
    sourceType: machineName,
    kind: "iframe",
    src,
    width: parsePixels(content?.width, 600),
    height: parsePixels(content?.height, 400)
  };
}
