import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.ImageHotspotQuestion";

type RawHotspot = {
  computedSettings?: { x?: number; y?: number; width?: number; height?: number };
  userSettings?: { correct?: boolean; feedbackText?: string };
};

/**
 * H5P.ImageHotspotQuestion — single-correct variant of MultipleHotspotQuestion.
 * Content shape mirrors MultipleHotspotQuestion (backgroundImageSettings +
 * hotspotSettings.hotspot[]). Output is the same descriptive text iDevice.
 */
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
      const correct = us?.correct ? "correct" : "incorrect";
      const feedback = typeof us?.feedbackText === "string" ? us.feedbackText : "";
      return (
        `<li><strong>Hotspot ${idx + 1}</strong> ` +
        `(x:${cs.x ?? "?"}% y:${cs.y ?? "?"}% w:${cs.width ?? "?"}% h:${cs.height ?? "?"}%, ${correct})` +
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
    id: uniqueId("ihs"),
    sourceType: machineName,
    kind: "text",
    html
  };
}
