import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";
import { escapeHtml, sanitizeHtml } from "../../utils/html.ts";

export const machineName = "H5P.Timeline";

function getMediaPath(value: any): string | null {
  return typeof value?.asset?.media === "string" && value.asset.media ? value.asset.media : null;
}

function renderMedia(value: any): string {
  const media = getMediaPath(value);
  if (!media) return "";
  return `<figure><img src="${escapeHtml(media)}" alt="${escapeHtml(value?.headline ?? value?.text ?? "")}" /></figure>`;
}

export function adapt(content: any): NormalizedNode {
  const timeline = content?.timeline ?? {};
  const headline =
    typeof timeline?.headline === "string" && timeline.headline.trim()
      ? timeline.headline.trim()
      : "Timeline";
  const intro = typeof timeline?.text === "string" ? sanitizeHtml(timeline.text) : "";
  const items: any[] = Array.isArray(timeline?.date) ? timeline.date : [];

  const entries = items
    .map((item) => {
      const start = typeof item?.startDate === "string" ? item.startDate : "";
      const end =
        typeof item?.endDate === "string" && item.endDate !== start ? ` - ${item.endDate}` : "";
      const label = [start, end].filter(Boolean).join("");
      const title = typeof item?.headline === "string" ? item.headline : "";
      const text = typeof item?.text === "string" ? sanitizeHtml(item.text) : "";
      return [
        `<li>`,
        label || title
          ? `<p><strong>${escapeHtml(label || title)}</strong>${title && label ? ` - ${escapeHtml(title)}` : ""}</p>`
          : "",
        renderMedia(item),
        text,
        `</li>`
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return {
    id: uniqueId("timeline"),
    sourceType: machineName,
    kind: "text",
    html: [
      `<h2>${escapeHtml(headline)}</h2>`,
      renderMedia(timeline),
      intro,
      entries ? `<ol>${entries}</ol>` : ""
    ]
      .filter(Boolean)
      .join("\n")
  };
}
