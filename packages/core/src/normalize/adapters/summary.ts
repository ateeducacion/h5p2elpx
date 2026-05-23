import type { NormalizedNode, NormalizedQuestionNode, NormalizedContainerNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.Summary";

/**
 * H5P.Summary: pick the correct statement from each group. The first item in
 * each `summary` array is always the correct one.
 */
export function adapt(content: any): NormalizedNode {
  const groups: any[] = Array.isArray(content?.summaries) ? content.summaries : [];
  const children: NormalizedQuestionNode[] = groups.map((g) => {
    const items: string[] = Array.isArray(g?.summary) ? g.summary : [];
    return {
      id: uniqueId("sum-q"),
      sourceType: machineName,
      kind: "question",
      questionType: "multichoice",
      prompt: typeof g?.tip === "string" && g.tip ? g.tip : "Pick the correct statement",
      answers: items.map((t, i) => ({ text: t, correct: i === 0 }))
    };
  });
  const container: NormalizedContainerNode = {
    id: uniqueId("sum"),
    sourceType: machineName,
    kind: "container",
    children
  };
  return container;
}
