import type { ElpxIdevice } from "../model.ts";
import { buildTextIdevice } from "./text.ts";
import { escapeHtml } from "../../utils/html.ts";

export type UnsupportedIdeviceInput = {
  pageId: string;
  blockId: string;
  order: number;
  originalLibrary: string;
  reason?: string;
  title?: string;
};

export function buildUnsupportedIdevice(input: UnsupportedIdeviceInput): ElpxIdevice {
  const html = [
    `<div class="h5p2elpx-unsupported">`,
    `  <h2>Unsupported H5P content</h2>`,
    `  <p><strong>H5P type:</strong> ${escapeHtml(input.originalLibrary)}</p>`,
    `  <p>${escapeHtml(
      input.reason ??
        "This H5P activity type is not supported by h5p2elpx yet. The original content has not been converted into an editable eXeLearning interaction."
    )}</p>`,
    `</div>`
  ].join("\n");
  return buildTextIdevice({
    pageId: input.pageId,
    blockId: input.blockId,
    order: input.order,
    title: input.title ?? `Unsupported: ${input.originalLibrary}`,
    html
  });
}
