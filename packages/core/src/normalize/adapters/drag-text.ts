import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.DragText";

/**
 * `textField` is plain HTML with `*answer*` markers identifying drop targets.
 * We surface it as a `blanks`-style question; the writer will render it via
 * the eXe `form` iDevice or similar.
 */
export function adapt(content: any): NormalizedNode {
  const prompt = typeof content?.taskDescription === "string" ? content.taskDescription : "";
  const text = typeof content?.textField === "string" ? content.textField : "";
  return {
    id: uniqueId("dt"),
    sourceType: machineName,
    kind: "question",
    questionType: "blanks",
    prompt,
    answers: [{ text }]
  };
}
