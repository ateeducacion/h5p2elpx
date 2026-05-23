import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.MemoryGame";

export function adapt(content: any): NormalizedNode {
  const cards: any[] = Array.isArray(content?.cards) ? content.cards : [];
  return {
    id: uniqueId("mem"),
    sourceType: machineName,
    kind: "flipcards",
    cards: cards.map((c) => ({
      front:
        typeof c?.image?.path === "string" ? `[image: ${c.image.path}]` : (c?.description ?? ""),
      back: typeof c?.match?.path === "string" ? `[image: ${c.match.path}]` : (c?.description ?? "")
    }))
  };
}
