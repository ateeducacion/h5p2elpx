import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.OpenEndedQuestion";

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function adapt(content: any): NormalizedNode {
  const question = typeof content?.question === "string" ? content.question : "";
  const placeholder = typeof content?.placeholderText === "string" ? content.placeholderText : "";
  const rows = Number(content?.inputRows);
  const safeRows = Number.isFinite(rows) && rows > 0 ? rows : 3;
  return {
    id: uniqueId("oeq"),
    sourceType: machineName,
    kind: "text",
    html: [
      question ? `<div class="h5p-open-ended-question">${question}</div>` : "",
      `<textarea rows="${safeRows}" style="width:100%" placeholder="${escapeAttr(placeholder)}"></textarea>`
    ]
      .filter(Boolean)
      .join("\n")
  };
}
