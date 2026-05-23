import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.InteractiveVideo";

export function adapt(content: any): NormalizedNode {
  const sources: any[] = Array.isArray(content?.interactiveVideo?.video?.files)
    ? content.interactiveVideo.video.files
    : [];
  const src = typeof sources[0]?.path === "string" ? sources[0].path : "";
  return {
    id: uniqueId("iv"),
    sourceType: machineName,
    kind: "video",
    src
  };
}
