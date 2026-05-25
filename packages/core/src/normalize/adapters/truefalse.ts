import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";
import { extractIntroMedia } from "../utils/intro-media.ts";

export const machineName = "H5P.TrueFalse";

export function adapt(content: any): NormalizedNode {
  const correct = String(content?.correct ?? "true").toLowerCase() === "true";
  return {
    id: uniqueId("tf"),
    sourceType: machineName,
    kind: "question",
    questionType: "truefalse",
    prompt: typeof content?.question === "string" ? content.question : "",
    answers: [
      { text: "True", correct },
      { text: "False", correct: !correct }
    ],
    media: extractIntroMedia(content)
  };
}
