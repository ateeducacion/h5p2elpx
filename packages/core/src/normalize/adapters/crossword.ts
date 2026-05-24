import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.Crossword";

type RawWord = {
  answer?: string;
  clue?: string;
  /** Some H5P.Crossword versions allow extra clue / fixed word fields. */
  extraClue?: string;
};

const MAX_WORD_LEN = 14;

/**
 * eXeLearning's crossword editor rejects any answer that contains
 * whitespace or is longer than 14 characters (see `msgMaximeSize` in
 * `crossword.js`). Strip whitespace and truncate so the grid loads;
 * preserve the original wording in the clue so learners still see
 * what they should type.
 */
function sanitizeAnswer(rawAnswer: string, clue: string): { word: string; definition: string } {
  const stripped = rawAnswer.replace(/\s+/g, "");
  const word = stripped.length > MAX_WORD_LEN ? stripped.slice(0, MAX_WORD_LEN) : stripped;
  const changed = word !== rawAnswer;
  const definition = changed ? `${clue} (answer: ${rawAnswer})` : clue;
  return { word, definition };
}

export function adapt(content: any): NormalizedNode {
  const words: RawWord[] = Array.isArray(content?.words) ? content.words : [];
  const entries = words
    .map((w) => {
      const rawAnswer = typeof w?.answer === "string" ? w.answer.trim() : "";
      const clue =
        typeof w?.clue === "string"
          ? w.clue.trim()
          : typeof w?.extraClue === "string"
            ? w.extraClue.trim()
            : "";
      return sanitizeAnswer(rawAnswer, clue);
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
