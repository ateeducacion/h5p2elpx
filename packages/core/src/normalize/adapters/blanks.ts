import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";
import { extractIntroMedia } from "../utils/intro-media.ts";

export const machineName = "H5P.Blanks";

export function adapt(content: any): NormalizedNode {
  const questions: string[] = Array.isArray(content?.questions) ? content.questions : [];
  const prompt = typeof content?.text === "string" ? content.text : "";
  return {
    id: uniqueId("bl"),
    sourceType: machineName,
    kind: "question",
    questionType: "blanks",
    prompt,
    answers: questions.map((q) => ({ text: q })),
    media: extractIntroMedia(content)
  };
}
