import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.Audio";

export function adapt(content: any): NormalizedNode {
  const files: any[] = Array.isArray(content?.files) ? content.files : [];
  const first = files[0];
  return {
    id: uniqueId("aud"),
    sourceType: machineName,
    kind: "audio",
    src: typeof first?.path === "string" ? first.path : ""
  };
}
