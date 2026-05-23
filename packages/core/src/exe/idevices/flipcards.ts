import type { ElpxIdevice } from "../model.ts";
import { newIdeviceId } from "../ids.ts";
import { escapeHtml } from "../../utils/html.ts";

export type FlipcardsInput = {
  pageId: string;
  blockId: string;
  order: number;
  cards: Array<{ front: string; back: string }>;
  title?: string;
};

export function buildFlipcardsIdevice(input: FlipcardsInput): ElpxIdevice {
  const html = [
    `<div class="h5p2elpx-flipcards">`,
    `  <ul>`,
    ...input.cards.map(
      (c) =>
        `    <li><div class="front">${escapeHtml(c.front)}</div><div class="back">${escapeHtml(c.back)}</div></li>`
    ),
    `  </ul>`,
    `</div>`
  ].join("\n");
  return {
    id: newIdeviceId(),
    pageId: input.pageId,
    blockId: input.blockId,
    typeName: "flipcards",
    title: input.title ?? "Flip cards",
    htmlView: html,
    jsonProperties: { cards: input.cards },
    order: input.order,
    visibility: true
  };
}
