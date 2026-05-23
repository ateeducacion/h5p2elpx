import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.MarkTheWords";

export function adapt(content: any): NormalizedNode {
  const prompt = typeof content?.taskDescription === "string" ? content.taskDescription : "";
  const text = typeof content?.textField === "string" ? content.textField : "";
  return {
    id: uniqueId("mtw"),
    sourceType: machineName,
    kind: "text",
    html: `<div class="h5p2elpx-mtw"><p>${prompt}</p><div>${text}</div></div>`
  };
}
