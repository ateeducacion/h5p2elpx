import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.AdvancedText";

export function adapt(content: any): NormalizedNode {
  return {
    id: uniqueId("atxt"),
    sourceType: machineName,
    kind: "text",
    html: typeof content?.text === "string" ? content.text : ""
  };
}
