import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.TrueFalse";

export function adapt(content: any): NormalizedNode {
  const correct = String(content?.correct ?? "true").toLowerCase() === "true";
  const mediaParams = content?.media?.type?.params;
  const mediaPath = typeof mediaParams?.file?.path === "string" ? mediaParams.file.path : undefined;
  const mediaAlt =
    typeof mediaParams?.alt === "string"
      ? mediaParams.alt
      : typeof mediaParams?.contentName === "string"
        ? mediaParams.contentName
        : undefined;
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
    media: mediaPath ? { src: mediaPath, alt: mediaAlt } : undefined
  };
}
