import type { NormalizedNode, NormalizedContainerNode, NormalizedQuestionNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.SingleChoiceSet";

/**
 * H5P.SingleChoiceSet has `choices: [{ question, answers: [correctText, ...wrongTexts] }]`.
 * The first answer is always the correct one.
 */
export function adapt(content: any): NormalizedNode {
  const choices: any[] = Array.isArray(content?.choices) ? content.choices : [];
  const children: NormalizedQuestionNode[] = choices.map((c) => {
    const answers: string[] = Array.isArray(c?.answers) ? c.answers : [];
    return {
      id: uniqueId("scs-q"),
      sourceType: machineName,
      kind: "question",
      questionType: "multichoice",
      prompt: typeof c?.question === "string" ? c.question : "",
      answers: answers.map((text, idx) => ({ text, correct: idx === 0 }))
    };
  });
  const container: NormalizedContainerNode = {
    id: uniqueId("scs"),
    sourceType: machineName,
    kind: "container",
    children
  };
  return container;
}
