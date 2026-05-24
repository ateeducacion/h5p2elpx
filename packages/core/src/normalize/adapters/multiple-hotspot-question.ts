import type { NormalizedHotspotMapPoint, NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.MultipleHotspotQuestion";

type RawHotspot = {
  shape?: string;
  computedSettings?: { x?: number; y?: number; width?: number; height?: number };
  userSettings?: { correct?: boolean; feedbackText?: string };
};

/**
 * H5P.MultipleHotspotQuestion — quiz where the learner identifies
 * one or more correct zones on an image. Each hotspot becomes a
 * rectangle on the `map` iDevice (`x1/y1` are set, triggering the
 * rectangle iconType in eXe). `correct` is propagated so the eXe
 * `selectsGame` quiz mode can grade clicks.
 */
export function adapt(content: any): NormalizedNode {
  // Some authoring tools nest the data under `multipleHotspotQuestion`.
  const root = content?.multipleHotspotQuestion ?? content;
  const imgPath =
    typeof root?.backgroundImageSettings?.path === "string"
      ? root.backgroundImageSettings.path
      : typeof root?.image?.path === "string"
        ? root.image.path
        : "";
  const taskDescription =
    typeof root?.hotspotSettings?.taskDescription === "string"
      ? root.hotspotSettings.taskDescription
      : typeof root?.taskDescription === "string"
        ? root.taskDescription
        : "";
  const hotspots: RawHotspot[] = Array.isArray(root?.hotspotSettings?.hotspot)
    ? root.hotspotSettings.hotspot
    : Array.isArray(root?.hotspot)
      ? root.hotspot
      : [];

  const points: NormalizedHotspotMapPoint[] = hotspots.map((h, idx) => {
    const cs = h?.computedSettings ?? {};
    const us = h?.userSettings ?? {};
    const x = Number(cs.x ?? 0);
    const y = Number(cs.y ?? 0);
    const w = Number(cs.width ?? 0);
    const ht = Number(cs.height ?? 0);
    return {
      x,
      y,
      x1: x + w,
      y1: y + ht,
      title: `Hotspot ${idx + 1}`,
      correct: !!us?.correct,
      eText: typeof us?.feedbackText === "string" ? us.feedbackText : ""
    };
  });

  return {
    id: uniqueId("mhs"),
    sourceType: machineName,
    kind: "hotspot-map",
    imageUrl: imgPath,
    instructions: taskDescription,
    isQuiz: true,
    points
  };
}
