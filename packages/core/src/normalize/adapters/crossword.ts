import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.Crossword";

type RawWord = {
  answer?: string;
  clue?: string;
  /** Some H5P.Crossword versions allow extra clue / fixed word fields. */
  extraClue?: string;
};

export function adapt(content: any): NormalizedNode {
  const words: RawWord[] = Array.isArray(content?.words) ? content.words : [];
  const entries = words
    .map((w) => {
      const word = typeof w?.answer === "string" ? w.answer.trim() : "";
      const definition =
        typeof w?.clue === "string"
          ? w.clue.trim()
          : typeof w?.extraClue === "string"
            ? w.extraClue.trim()
            : "";
      return { word, definition };
    })
    .filter((e) => e.word.length > 0);
  return {
    id: uniqueId("cw"),
    sourceType: machineName,
    kind: "crossword",
    title: typeof content?.title === "string" ? content.title : undefined,
    entries
  };
}
