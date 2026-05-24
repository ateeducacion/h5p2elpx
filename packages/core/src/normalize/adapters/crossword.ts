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
 * Two constraints from eXeLearning's crossword runtime drive this:
 *
 * 1. The editor rejects any answer that contains whitespace or is
 *    longer than 14 characters (`msgMaximeSize` in `crossword.js`).
 * 2. The auto-layout solver's `canPlaceWord`
 *    (`base/crossword/export/crossword.js:1680`) checks intersections
 *    with strict `cell.letter !== word[i]` — case-sensitive
 *    regardless of `caseSensitive`. Mixed-case answers (e.g.
 *    "Athens" + "Agra") fail to cross at their shared `A`/`a`, so
 *    every word lands in its own isolated corridor.
 *
 * Fix: strip whitespace, truncate to 14 chars, **uppercase** the
 * result. Crosswords are traditionally uppercase anyway. The original
 * answer text is preserved in the clue (`(answer: "New York")`) so the
 * learner still sees the intended phrasing.
 */
function sanitizeAnswer(rawAnswer: string, clue: string): { word: string; definition: string } {
  const stripped = rawAnswer.replace(/\s+/g, "");
  const truncated = stripped.length > MAX_WORD_LEN ? stripped.slice(0, MAX_WORD_LEN) : stripped;
  const word = truncated.toUpperCase();
  const changed = truncated !== rawAnswer;
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
