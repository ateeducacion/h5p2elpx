import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.Flashcards";

/** H5P.Flashcards content.json: { cards: [ { text, answer, tip, image: { path,... } } ] } */
export function adapt(content: any): NormalizedNode {
  const cards: any[] = Array.isArray(content?.cards) ? content.cards : [];
  return {
    id: uniqueId("fc"),
    sourceType: machineName,
    kind: "flipcards",
    cards: cards.map((c) => {
      const imgPath = typeof c?.image?.path === "string" ? c.image.path : "";
      const prompt = typeof c?.text === "string" ? c.text : "";
      const front = imgPath
        ? prompt
          ? `${prompt}<br /><img src="${imgPath}" alt="" />`
          : `<img src="${imgPath}" alt="" />`
        : prompt;
      return {
        front,
        back: typeof c?.answer === "string" ? c.answer : ""
      };
    })
  };
}
