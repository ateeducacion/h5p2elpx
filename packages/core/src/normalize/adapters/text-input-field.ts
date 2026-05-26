import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.TextInputField";

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function adapt(content: any): NormalizedNode {
  const task = typeof content?.taskDescription === "string" ? content.taskDescription : "";
  const placeholder = typeof content?.placeholderText === "string" ? content.placeholderText : "";
  const size = Number(content?.inputFieldSize);
  const rows = Number.isFinite(size) && size > 1 ? Math.round(size) : 1;
  const required = content?.requiredField === true ? " required" : "";

  const field =
    rows > 1
      ? `<textarea rows="${rows}" style="width:100%" placeholder="${escapeAttr(placeholder)}"${required}></textarea>`
      : `<input type="text" style="width:100%" placeholder="${escapeAttr(placeholder)}"${required} />`;

  return {
    id: uniqueId("tif"),
    sourceType: machineName,
    kind: "text",
    html: [task, field].filter(Boolean).join("\n")
  };
}
