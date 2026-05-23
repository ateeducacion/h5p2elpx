import type { ElpxIdevice } from "../model.ts";
import { newIdeviceId } from "../ids.ts";
import { escapeHtml } from "../../utils/html.ts";

export type DragDropInput = {
  pageId: string;
  blockId: string;
  order: number;
  prompt: string;
  items: Array<{ label: string; target?: string }>;
  title?: string;
};

export function buildDragDropIdevice(input: DragDropInput): ElpxIdevice {
  const html = [
    `<div class="h5p2elpx-dragdrop">`,
    `  <p class="prompt">${escapeHtml(input.prompt)}</p>`,
    `  <ul>`,
    ...input.items.map(
      (it) =>
        `    <li><span class="draggable">${escapeHtml(it.label)}</span>${
          it.target ? ` &rarr; <span class="target">${escapeHtml(it.target)}</span>` : ""
        }</li>`
    ),
    `  </ul>`,
    `</div>`
  ].join("\n");
  return {
    id: newIdeviceId(),
    pageId: input.pageId,
    blockId: input.blockId,
    typeName: "dragdrop",
    title: input.title ?? "Drag & drop",
    htmlView: html,
    jsonProperties: { prompt: input.prompt, items: input.items },
    order: input.order,
    visibility: true
  };
}
