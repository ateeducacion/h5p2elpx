import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.Essay";

/** H5P.Essay content.json: { taskDescription, placeholderText, keywords:[], behaviour:{...} } */
export function adapt(content: any): NormalizedNode {
  const task = typeof content?.taskDescription === "string" ? content.taskDescription : "";
  const placeholder = typeof content?.placeholderText === "string" ? content.placeholderText : "";
  return {
    id: uniqueId("essay"),
    sourceType: machineName,
    kind: "text",
    html: [
      task ? `<div class="h5p-essay-task">${task}</div>` : "",
      `<textarea rows="10" style="width:100%" placeholder="${placeholder.replace(/"/g, "&quot;")}"></textarea>`,
      `<p><em>Note: keyword-based grading from H5P.Essay is not preserved.</em></p>`
    ]
      .filter(Boolean)
      .join("\n")
  };
}
