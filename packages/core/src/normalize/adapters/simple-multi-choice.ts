import type { NormalizedAnswer, NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.SimpleMultiChoice";

export function adapt(content: any): NormalizedNode {
  const answers: NormalizedAnswer[] = Array.isArray(content?.alternatives)
    ? content.alternatives.map((alt: any) => ({
        text: typeof alt?.text === "string" ? alt.text : "",
        feedback:
          typeof alt?.feedback?.chosenFeedback === "string"
            ? alt.feedback.chosenFeedback
            : undefined
      }))
    : [];
  return {
    id: uniqueId("smc"),
    sourceType: machineName,
    kind: "question",
    questionType: "multichoice",
    prompt: typeof content?.question === "string" ? content.question : "",
    answers,
    selectionType: content?.inputType === "checkbox" ? "multiple" : "single"
  };
}
