import type { ElpxIdevice } from "../model.ts";
import { newIdeviceId } from "../ids.ts";
import { escapeHtml } from "../../utils/html.ts";

export type BeforeAfterInput = {
  pageId: string;
  blockId: string;
  order: number;
  beforeSrc: string;
  beforeLabel?: string;
  beforeAlt?: string;
  afterSrc: string;
  afterLabel?: string;
  afterAlt?: string;
  title?: string;
};

/**
 * Mirrors the `beforeafter` iDevice. Storage pattern is htmlView-only —
 * the runtime reads the two images directly from the rendered HTML and
 * stores no separate JSON state. `jsonProperties` is emitted as an empty
 * object (the XML writer self-closes it).
 *
 * See `doc/elpx-format/idevices/snippets.md` → "beforeafter".
 */
export function buildBeforeAfterIdevice(input: BeforeAfterInput): ElpxIdevice {
  const id = newIdeviceId();
  const beforeLabel = input.beforeLabel ?? "Before";
  const afterLabel = input.afterLabel ?? "After";
  const htmlView = [
    `<div class="beforeafter-IDevice">`,
    `  <figure class="beforeafter-Before">`,
    `    <img src="${escapeHtml(input.beforeSrc)}" alt="${escapeHtml(input.beforeAlt ?? beforeLabel)}" />`,
    `    <figcaption>${escapeHtml(beforeLabel)}</figcaption>`,
    `  </figure>`,
    `  <figure class="beforeafter-After">`,
    `    <img src="${escapeHtml(input.afterSrc)}" alt="${escapeHtml(input.afterAlt ?? afterLabel)}" />`,
    `    <figcaption>${escapeHtml(afterLabel)}</figcaption>`,
    `  </figure>`,
    `</div>`
  ].join("\n");

  return {
    id,
    pageId: input.pageId,
    blockId: input.blockId,
    typeName: "beforeafter",
    title: input.title ?? "Before / After",
    htmlView,
    jsonProperties: {},
    order: input.order,
    visibility: true
  };
}
