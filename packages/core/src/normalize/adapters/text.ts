import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.Text";

export function adapt(content: any): NormalizedNode {
  return {
    id: uniqueId("text"),
    sourceType: machineName,
    kind: "text",
    html: typeof content?.text === "string" ? content.text : ""
  };
}
