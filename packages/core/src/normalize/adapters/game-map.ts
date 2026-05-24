import type { NormalizedHotspotMapPoint, NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.GameMap";

/** H5P.GameMap content.json (best-effort):
 *   { gamemapSteps: {
 *       backgroundImageSettings: { backgroundImage: { path? | params: { file: { path } } } },
 *       gamemap: { elements: [
 *         { id, label?, telemetry?: "x,y,w,h", contentsList?: [ { contentType: { params: { ... } } } ] }
 *       ] }
 *     } }
 *
 * Each map "stage" becomes a hotspot marker over the background image. We
 * pin markers by parsing the H5P `telemetry` ("x,y,w,h" in percent) and use
 * the stage label as the marker title. When the stage exposes one or more
 * sub-content items we render them into the popup `eText` so learners can
 * still see the embedded text/images.
 */
function bgPath(content: any): string {
  const bg = content?.gamemapSteps?.backgroundImageSettings?.backgroundImage;
  if (!bg) return "";
  if (typeof bg?.path === "string") return bg.path;
  if (typeof bg?.params?.file?.path === "string") return bg.params.file.path;
  return "";
}

function parseTelemetry(tel: any): { x: number; y: number; x1?: number; y1?: number } {
  if (typeof tel !== "string") return { x: 50, y: 50 };
  const parts = tel.split(",").map((p: string) => Number.parseFloat(p));
  const x = parts[0];
  const y = parts[1];
  const w = parts[2];
  const h = parts[3];
  if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y))
    return { x: 50, y: 50 };
  if (typeof w === "number" && typeof h === "number" && Number.isFinite(w) && Number.isFinite(h)) {
    return { x, y, x1: x + w, y1: y + h };
  }
  return { x, y };
}

function renderStageContents(stage: any): string {
  const items: any[] = Array.isArray(stage?.contentsList) ? stage.contentsList : [];
  return items
    .map((c) => {
      const params = c?.contentType?.params ?? c?.params ?? {};
      const lib = String(c?.contentType?.library ?? "");
      if (lib.startsWith("H5P.AdvancedText") || lib.startsWith("H5P.Text")) {
        return typeof params?.text === "string" ? params.text : "";
      }
      if (lib.startsWith("H5P.Image") && typeof params?.file?.path === "string") {
        return `<figure><img src="${params.file.path}" alt="${params.alt ?? ""}" /></figure>`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

export function adapt(content: any): NormalizedNode {
  const elements: any[] = Array.isArray(content?.gamemapSteps?.gamemap?.elements)
    ? content.gamemapSteps.gamemap.elements
    : [];
  const points: NormalizedHotspotMapPoint[] = elements.map((e) => {
    const t = parseTelemetry(e?.telemetry);
    return {
      ...t,
      title: typeof e?.label === "string" ? e.label : "",
      eText: renderStageContents(e)
    };
  });
  return {
    id: uniqueId("gm"),
    sourceType: machineName,
    kind: "hotspot-map",
    imageUrl: bgPath(content),
    points
  };
}
