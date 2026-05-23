import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.Video";

export function adapt(content: any): NormalizedNode {
  const sources: any[] = Array.isArray(content?.sources) ? content.sources : [];
  const first = sources[0];
  return {
    id: uniqueId("vid"),
    sourceType: machineName,
    kind: "video",
    src: typeof first?.path === "string" ? first.path : "",
    poster:
      typeof content?.visuals?.poster?.path === "string" ? content.visuals.poster.path : undefined
  };
}
