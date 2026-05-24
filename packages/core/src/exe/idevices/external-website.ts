import type { ElpxIdevice } from "../model.ts";
import { newIdeviceId } from "../ids.ts";
import { escapeHtml } from "../../utils/html.ts";

export type ExternalWebsiteInput = {
  pageId: string;
  blockId: string;
  order: number;
  src: string;
  width?: number;
  height?: number;
  title?: string;
};

/**
 * Mirrors the `external-website` iDevice. Storage pattern is htmlView-only:
 * a single `<iframe>` plus an error fallback. No separate JSON state.
 *
 * See `doc/elpx-format/idevices/snippets.md` → "external-website".
 */
export function buildExternalWebsiteIdevice(input: ExternalWebsiteInput): ElpxIdevice {
  const id = newIdeviceId();
  const width = input.width ?? 600;
  const height = input.height ?? 400;
  const htmlView = [
    `<div id="iframeWebsiteIdevice">`,
    `  <iframe src="${escapeHtml(input.src)}" width="${width}" height="${height}" style="width:100%;" frameborder="0" allowfullscreen></iframe>`,
    `  <div class="iframe-error-message" style="display:none;">`,
    `    The embedded page could not be displayed.`,
    `  </div>`,
    `</div>`
  ].join("\n");

  return {
    id,
    pageId: input.pageId,
    blockId: input.blockId,
    typeName: "external-website",
    title: input.title ?? "External website",
    htmlView,
    jsonProperties: {},
    order: input.order,
    visibility: true
  };
}
