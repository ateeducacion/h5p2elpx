import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.AdventCalendar";

/** H5P.AdventCalendar content.json (best-effort):
 *   { doors: [
 *       { day, content: { contentType: { params: { text|file.path } } } | text | image | ... }
 *     ] }
 * Each "door" becomes a flipcard: day number on the front, revealed content on the back.
 */
function renderDoorContent(door: any): string {
  if (typeof door?.content === "string") return door.content;

  const inner = door?.content?.contentType?.params ?? door?.content?.params ?? door?.content ?? {};
  const lib = String(door?.content?.contentType?.library ?? "");

  if (typeof inner?.text === "string" && inner.text) return inner.text;
  if (typeof inner?.file?.path === "string") {
    const alt = typeof inner?.alt === "string" ? inner.alt : "";
    return `<img src="${inner.file.path}" alt="${alt}" />`;
  }
  if (lib.startsWith("H5P.Video") || lib.startsWith("H5P.Audio")) {
    const tag = lib.startsWith("H5P.Video") ? "video" : "audio";
    const src = inner?.sources?.[0]?.path ?? inner?.files?.[0]?.path;
    if (typeof src === "string") return `<${tag} controls src="${src}"></${tag}>`;
  }
  if (typeof door?.text === "string") return door.text;
  return "";
}

export function adapt(content: any): NormalizedNode {
  const doors: any[] = Array.isArray(content?.doors) ? content.doors : [];
  return {
    id: uniqueId("adv"),
    sourceType: machineName,
    kind: "flipcards",
    cards: doors.map((d, idx) => {
      const day = typeof d?.day === "number" ? d.day : idx + 1;
      return {
        front: `Day ${day}`,
        back: renderDoorContent(d)
      };
    })
  };
}
