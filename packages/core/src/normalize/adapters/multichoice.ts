import type { NormalizedNode, NormalizedAnswer } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";
import { extractIntroMedia } from "../utils/intro-media.ts";

export const machineName = "H5P.MultiChoice";

export function adapt(content: any): NormalizedNode {
  const answers: NormalizedAnswer[] = Array.isArray(content?.answers)
    ? content.answers.map((a: any) => ({
        text: typeof a?.text === "string" ? a.text : "",
        correct: !!a?.correct,
        feedback:
          typeof a?.tipsAndFeedback?.chosenFeedback === "string"
            ? a.tipsAndFeedback.chosenFeedback
            : undefined
      }))
    : [];
  return {
    id: uniqueId("mc"),
    sourceType: machineName,
    kind: "question",
    questionType: "multichoice",
    prompt: typeof content?.question === "string" ? content.question : "",
    answers,
    media: extractIntroMedia(content)
  };
}
