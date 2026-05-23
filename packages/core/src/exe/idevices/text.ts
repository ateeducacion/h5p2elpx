import type { ElpxIdevice } from "../model.ts";
import { newIdeviceId } from "../ids.ts";

export type TextIdeviceInput = {
  pageId: string;
  blockId: string;
  order: number;
  title?: string;
  html: string;
};

export function buildTextIdevice(input: TextIdeviceInput): ElpxIdevice {
  return {
    id: newIdeviceId(),
    pageId: input.pageId,
    blockId: input.blockId,
    typeName: "text",
    title: input.title ?? "Text",
    htmlView: input.html,
    jsonProperties: { content: input.html },
    order: input.order,
    visibility: true
  };
}
