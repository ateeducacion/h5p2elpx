import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.MultipleHotspotQuestion";

type RawHotspot = {
  shape?: string;
  computedSettings?: { x?: number; y?: number; width?: number; height?: number };
  userSettings?: { correct?: boolean; feedbackText?: string };
};

export function adapt(content: any): NormalizedNode {
  const imgPath =
    typeof content?.backgroundImageSettings?.path === "string"
      ? content.backgroundImageSettings.path
      : typeof content?.image?.path === "string"
        ? content.image.path
        : "";
  const taskDescription =
    typeof content?.hotspotSettings?.taskDescription === "string"
      ? content.hotspotSettings.taskDescription
      : typeof content?.taskDescription === "string"
        ? content.taskDescription
        : "";
  const hotspots: RawHotspot[] = Array.isArray(content?.hotspotSettings?.hotspot)
    ? content.hotspotSettings.hotspot
    : Array.isArray(content?.hotspot)
      ? content.hotspot
      : [];

  const list = hotspots
    .map((h, idx) => {
      const cs = h?.computedSettings ?? {};
      const us = h?.userSettings ?? {};
      const x = round1(cs.x);
      const y = round1(cs.y);
      const w = round1(cs.width);
      const ht = round1(cs.height);
      const shape = h?.shape ?? "rectangle";
      const correct = us?.correct ? "correct" : "incorrect";
      const feedback = typeof us?.feedbackText === "string" ? us.feedbackText : "";
      return (
        `<li>` +
        `<strong>Hotspot ${idx + 1}</strong> ` +
        `(${shape}, x:${x}% y:${y}% w:${w}% h:${ht}%, ${correct})` +
        (feedback ? `<div>${feedback}</div>` : "") +
        `</li>`
      );
    })
    .join("\n");

  const html =
    (imgPath ? `<figure><img src="${imgPath}" alt="" /></figure>` : "") +
    (taskDescription ? `<p>${taskDescription}</p>` : "") +
    `<ol class="h5p2elpx-hotspots">${list}</ol>`;

  return {
    id: uniqueId("mhs"),
    sourceType: machineName,
    kind: "text",
    html
  };
}

function round1(n: unknown): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "?";
  return (Math.round(v * 10) / 10).toString();
}
