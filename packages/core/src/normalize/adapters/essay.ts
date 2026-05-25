import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";
import { extractIntroMedia } from "../utils/intro-media.ts";

export const machineName = "H5P.Essay";

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** H5P.Essay content.json: { taskDescription, placeholderText, keywords:[], behaviour:{...} } */
export function adapt(content: any): NormalizedNode {
  const task = typeof content?.taskDescription === "string" ? content.taskDescription : "";
  const placeholder = typeof content?.placeholderText === "string" ? content.placeholderText : "";
  const media = extractIntroMedia(content);
  const mediaHtml = media
    ? `<figure><img src="${escapeAttr(media.src)}" alt="${escapeAttr(media.alt ?? "")}" /></figure>`
    : "";
  return {
    id: uniqueId("essay"),
    sourceType: machineName,
    kind: "text",
    html: [
      mediaHtml,
      task ? `<div class="h5p-essay-task">${task}</div>` : "",
      `<textarea rows="10" style="width:100%" placeholder="${placeholder.replace(/"/g, "&quot;")}"></textarea>`,
      `<p><em>Note: keyword-based grading from H5P.Essay is not preserved.</em></p>`
    ]
      .filter(Boolean)
      .join("\n")
  };
}
