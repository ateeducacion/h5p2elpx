import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.AdvancedBlanks";

/** H5P.AdvancedBlanks ("Complex Fill the Blanks") content.json (best-effort):
 *   { text: "<p>Some prose</p>",
 *     blanksList: [ { clozeText: "Lorem [ipsum|alt1|alt2] dolor", ... } ] }
 *   or the same `[answer|alt...]` markers embedded in `content.text`.
 *
 * The eXe `form` (fill) iDevice expects each blank as `*answer*`, so we
 * rewrite the H5P bracket syntax accordingly and reuse the same downstream
 * pipeline as H5P.Blanks.
 */
const BRACKET = /\[([^\]]+)\]/g;

function rewriteBrackets(src: string): string {
  return src.replace(BRACKET, (_m, body) => {
    const head = String(body).split("|")[0]?.trim() ?? "";
    return head ? `*${head}*` : "";
  });
}

export function adapt(content: any): NormalizedNode {
  const prompt = typeof content?.text === "string" ? content.text : "";
  const blanks: any[] = Array.isArray(content?.blanksList) ? content.blanksList : [];

  const questions: string[] = [];
  for (const b of blanks) {
    const raw = typeof b?.clozeText === "string" ? b.clozeText : "";
    if (raw) questions.push(rewriteBrackets(raw));
  }
  if (questions.length === 0 && BRACKET.test(prompt)) {
    BRACKET.lastIndex = 0;
    questions.push(rewriteBrackets(prompt));
  }

  return {
    id: uniqueId("cfb"),
    sourceType: machineName,
    kind: "question",
    questionType: "blanks",
    prompt,
    answers: questions.map((q) => ({ text: q }))
  };
}
