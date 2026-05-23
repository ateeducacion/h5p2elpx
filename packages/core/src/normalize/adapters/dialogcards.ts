import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.Dialogcards";

export function adapt(content: any): NormalizedNode {
  const cards: any[] = Array.isArray(content?.dialogs) ? content.dialogs : [];
  return {
    id: uniqueId("dc"),
    sourceType: machineName,
    kind: "flipcards",
    cards: cards.map((c) => ({
      front: typeof c?.text === "string" ? c.text : "",
      back: typeof c?.answer === "string" ? c.answer : ""
    }))
  };
}
