import type { NormalizedHotspotMapPoint, NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.ImageHotspots";

/**
 * H5P.ImageHotspots — informational hotspots on a background image.
 *
 * Each hotspot has `position: { x, y }` in percent and `content[]`, an
 * array of mini-libraries (AdvancedText, Image, Video, Link, Audio).
 * We render each sub-content into HTML for the popup body (`eText`)
 * and pin the marker at `position.x` / `position.y`.
 */
function renderContentBody(items: any[]): string {
  return items
    .map((c) => {
      const action = c?.action ?? c;
      const params = action?.params ?? {};
      const lib = String(action?.library ?? "");
      if (lib.startsWith("H5P.AdvancedText") || lib.startsWith("H5P.Text")) {
        return typeof params?.text === "string" ? params.text : "";
      }
      if (lib.startsWith("H5P.Image") && typeof params?.file?.path === "string") {
        return `<figure><img src="${params.file.path}" alt="${params.alt ?? ""}" /></figure>`;
      }
      if (lib.startsWith("H5P.Video")) {
        const src = params?.sources?.[0]?.path;
        return src ? `<video controls src="${src}"></video>` : "";
      }
      if (lib.startsWith("H5P.Audio")) {
        const src = params?.files?.[0]?.path;
        return src ? `<audio controls src="${src}"></audio>` : "";
      }
      if (lib.startsWith("H5P.Link") && typeof params?.url === "string") {
        return `<a href="${params.url}">${params?.title ?? params.url}</a>`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function textTitleFromHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function percentToRatio(value: unknown, fallback: number): number {
  const numberValue = Number(value ?? fallback);
  if (!Number.isFinite(numberValue)) return fallback / 100;
  return Math.min(1, Math.max(0, numberValue / 100));
}

export function adapt(content: any): NormalizedNode {
  const imgPath = typeof content?.image?.path === "string" ? content.image.path : "";
  const hotspots: any[] = Array.isArray(content?.hotspots) ? content.hotspots : [];
  const points: NormalizedHotspotMapPoint[] = hotspots.map((h, idx) => {
    const items = Array.isArray(h?.content) ? h.content : [];
    const eText = renderContentBody(items);
    const header = typeof h?.header === "string" ? h.header.trim() : "";
    return {
      x: percentToRatio(h?.position?.x, 50),
      y: percentToRatio(h?.position?.y, 50),
      type: 2,
      title: header || textTitleFromHtml(eText) || `Hotspot ${idx + 1}`,
      eText
    };
  });
  return {
    id: uniqueId("hs"),
    sourceType: machineName,
    kind: "hotspot-map",
    imageUrl: imgPath,
    points
  };
}
