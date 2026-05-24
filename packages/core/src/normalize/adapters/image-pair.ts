import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.ImagePair";

/** H5P.ImagePair content.json: { cards: [ { image:{path}, imageAlt, match:{image:{path}}, matchAlt } ] } */
export function adapt(content: any): NormalizedNode {
  const cards: any[] = Array.isArray(content?.cards) ? content.cards : [];
  return {
    id: uniqueId("ip"),
    sourceType: machineName,
    kind: "flipcards",
    cards: cards.map((c) => {
      const a = c?.image?.path;
      const b = c?.match?.path ?? c?.match?.image?.path;
      const aAlt = c?.imageAlt ?? "";
      const bAlt = c?.matchAlt ?? "";
      return {
        front: typeof a === "string" ? `<img src="${a}" alt="${aAlt}" />` : "",
        back: typeof b === "string" ? `<img src="${b}" alt="${bAlt}" />` : ""
      };
    })
  };
}
