import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.InformationWall";

/** H5P.InformationWall content.json (best-effort):
 *   { panels: [
 *       { panelImage?: { path, alt? }, panelTitle?, panelInformation?, panelAddInformation? }
 *     ] }
 * Each panel becomes a flipcard: the visible front (title + main info + image)
 * and an optional "more info" back. When there is no back content, we still emit
 * a card with the main info on the back so the flipcards iDevice has something
 * to reveal.
 */
function renderImage(img: any): string {
  const path =
    typeof img?.path === "string"
      ? img.path
      : typeof img?.params?.file?.path === "string"
        ? img.params.file.path
        : "";
  if (!path) return "";
  const alt =
    typeof img?.alt === "string"
      ? img.alt
      : typeof img?.params?.alt === "string"
        ? img.params.alt
        : "";
  return `<img src="${path}" alt="${alt}" />`;
}

export function adapt(content: any): NormalizedNode {
  const panels: any[] = Array.isArray(content?.panels) ? content.panels : [];
  return {
    id: uniqueId("iw"),
    sourceType: machineName,
    kind: "flipcards",
    cards: panels.map((p) => {
      const title = typeof p?.panelTitle === "string" ? p.panelTitle : "";
      const info = typeof p?.panelInformation === "string" ? p.panelInformation : "";
      const more = typeof p?.panelAddInformation === "string" ? p.panelAddInformation : "";
      const image = renderImage(p?.panelImage);
      const frontParts = [image, title ? `<strong>${title}</strong>` : "", info].filter(Boolean);
      return {
        front: frontParts.join("<br />"),
        back: more || info || title
      };
    })
  };
}
