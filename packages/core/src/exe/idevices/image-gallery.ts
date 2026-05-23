import type { ElpxIdevice } from "../model.ts";
import { newIdeviceId } from "../ids.ts";
import { escapeHtml } from "../../utils/html.ts";

export type ImageGalleryInput = {
  pageId: string;
  blockId: string;
  order: number;
  images: Array<{ src: string; alt?: string; caption?: string }>;
  title?: string;
};

export function buildImageGalleryIdevice(input: ImageGalleryInput): ElpxIdevice {
  const html = [
    `<div class="h5p2elpx-gallery">`,
    `  <ul>`,
    ...input.images.map(
      (img) =>
        `    <li><img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt ?? "")}" />${
          img.caption ? `<p class="caption">${escapeHtml(img.caption)}</p>` : ""
        }</li>`
    ),
    `  </ul>`,
    `</div>`
  ].join("\n");
  return {
    id: newIdeviceId(),
    pageId: input.pageId,
    blockId: input.blockId,
    typeName: "image-gallery",
    title: input.title ?? "Image gallery",
    htmlView: html,
    jsonProperties: { images: input.images },
    order: input.order,
    visibility: true
  };
}
