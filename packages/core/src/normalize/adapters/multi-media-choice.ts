import type { NormalizedAnswer, NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.MultiMediaChoice";

/** H5P.MultiMediaChoice content.json (best-effort):
 *   { question?, options: [
 *       { media?: { params: { file: { path }, alt? } } | { path }, correct?, feedback? }
 *     ] }
 * Same selection model as H5P.MultiChoice but with image options — we render the
 * thumbnail inside the answer text and let convert.ts pick selectionType
 * single/multiple based on how many are correct.
 */
function optionToText(opt: any, idx: number): string {
  const media = opt?.media?.params ?? opt?.media ?? opt?.image ?? {};
  const path =
    typeof media?.file?.path === "string"
      ? media.file.path
      : typeof media?.path === "string"
        ? media.path
        : "";
  const alt =
    typeof media?.alt === "string"
      ? media.alt
      : typeof opt?.alt === "string"
        ? opt.alt
        : `Option ${idx + 1}`;
  if (path) return `<img src="${path}" alt="${alt}" />`;
  return typeof opt?.text === "string" && opt.text ? opt.text : alt;
}

export function adapt(content: any): NormalizedNode {
  const options: any[] = Array.isArray(content?.options) ? content.options : [];
  const answers: NormalizedAnswer[] = options.map((o, i) => ({
    text: optionToText(o, i),
    correct: !!o?.correct,
    feedback:
      typeof o?.feedback === "string"
        ? o.feedback
        : typeof o?.tipsAndFeedback?.chosenFeedback === "string"
          ? o.tipsAndFeedback.chosenFeedback
          : undefined
  }));
  return {
    id: uniqueId("mmc"),
    sourceType: machineName,
    kind: "question",
    questionType: "multichoice",
    prompt: typeof content?.question === "string" ? content.question : "",
    answers
  };
}
