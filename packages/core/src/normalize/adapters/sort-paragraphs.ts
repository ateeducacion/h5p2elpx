import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.SortParagraphs";

/** H5P.SortParagraphs content.json: { paragraphs: [ "<p>...</p>", ... ], taskDescription, behaviour } */
export function adapt(content: any): NormalizedNode {
  const items: string[] = Array.isArray(content?.paragraphs)
    ? content.paragraphs.filter((s: unknown): s is string => typeof s === "string")
    : [];
  const task = typeof content?.taskDescription === "string" ? content.taskDescription : "";
  const list = items.map((p, i) => `<li><strong>${i + 1}.</strong> ${p}</li>`).join("\n");
  return {
    id: uniqueId("sp"),
    sourceType: machineName,
    kind: "text",
    html: [
      task ? `<p>${task}</p>` : "",
      items.length > 0
        ? `<p><em>(Correct order — author should re-scramble in eXe.)</em></p><ol>${list}</ol>`
        : "<p>(empty)</p>"
    ]
      .filter(Boolean)
      .join("\n")
  };
}
