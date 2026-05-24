import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.FindTheWords";

/** H5P.FindTheWords content.json: { taskDescription, wordList: "WORD1,WORD2,...", behaviour: {...} } */
export function adapt(content: any): NormalizedNode {
  const raw = typeof content?.wordList === "string" ? content.wordList : "";
  const words = raw
    .split(/[,\n]+/)
    .map((w: string) => w.trim())
    .filter((w: string) => w.length > 0);
  return {
    id: uniqueId("ftw"),
    sourceType: machineName,
    kind: "word-search",
    words,
    taskDescription:
      typeof content?.taskDescription === "string" ? content.taskDescription : undefined
  };
}
