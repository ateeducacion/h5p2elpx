import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";
import { extractIntroMedia } from "../utils/intro-media.ts";

export const machineName = "H5P.MarkTheWords";

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function adapt(content: any): NormalizedNode {
  const prompt = typeof content?.taskDescription === "string" ? content.taskDescription : "";
  const text = typeof content?.textField === "string" ? content.textField : "";
  const media = extractIntroMedia(content);
  const mediaHtml = media
    ? `<figure><img src="${escapeAttr(media.src)}" alt="${escapeAttr(media.alt ?? "")}" /></figure>`
    : "";
  return {
    id: uniqueId("mtw"),
    sourceType: machineName,
    kind: "text",
    html: `<div class="h5p2elpx-mtw">${mediaHtml}<p>${prompt}</p><div>${text}</div></div>`
  };
}
