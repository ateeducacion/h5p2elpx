import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";
import { escapeHtml } from "../../utils/html.ts";

export const machineName = "H5P.Link";

/**
 * H5P.Link content.json: `{ linkWidget: { protocol, url }, title }`.
 * In H5P.CoursePresentation these appear as clickable annotations layered
 * over a slide; in standalone use they show as a labelled hyperlink. We
 * render them as a paragraph with an `<a href>` — the URL rewriter leaves
 * absolute http(s) URLs untouched.
 */
export function adapt(content: any): NormalizedNode {
  const protocol =
    typeof content?.linkWidget?.protocol === "string" ? content.linkWidget.protocol : "https://";
  const url = typeof content?.linkWidget?.url === "string" ? content.linkWidget.url : "";
  const title = typeof content?.title === "string" && content.title ? content.title : url;
  const href = url ? `${protocol}${url}` : "#";
  return {
    id: uniqueId("lnk"),
    sourceType: machineName,
    kind: "text",
    html: `<p><a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(title)}</a></p>`
  };
}
