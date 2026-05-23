import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";
import { adaptUnsupported } from "./unsupported.ts";

export const machineName = "H5P.DragQuestion";

/**
 * H5P.DragQuestion is geometrically complex (drop zones at coordinates).
 * Best-effort: list draggables → drop-zone names so users can rebuild it.
 */
export function adapt(content: any): NormalizedNode {
  const elements: any[] = Array.isArray(content?.question?.task?.elements)
    ? content.question.task.elements
    : [];
  const dropZones: any[] = Array.isArray(content?.question?.task?.dropZones)
    ? content.question.task.dropZones
    : [];
  if (elements.length === 0 && dropZones.length === 0) {
    return adaptUnsupported(machineName, content);
  }
  const html = [
    `<div class="h5p2elpx-dragquestion-fallback">`,
    `  <p><strong>Draggable items:</strong></p>`,
    `  <ul>`,
    ...elements.map((e) => `    <li>${escapeHtml(getLabel(e))}</li>`),
    `  </ul>`,
    `  <p><strong>Drop zones:</strong></p>`,
    `  <ul>`,
    ...dropZones.map((d) => `    <li>${escapeHtml(d?.label ?? "(unnamed)")}</li>`),
    `  </ul>`,
    `</div>`
  ].join("\n");
  return {
    id: uniqueId("dq"),
    sourceType: machineName,
    kind: "text",
    html
  };
}

function getLabel(el: any): string {
  if (typeof el?.type?.params?.alt === "string") return el.type.params.alt;
  if (typeof el?.type?.params?.text === "string") return el.type.params.text;
  return "(draggable)";
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
