import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";
import { adaptH5pSubContent } from "./index.ts";

export const machineName = "H5P.QuestionSet";

/** H5P.QuestionSet content.json: { questions: [ { library, params } ], introPage, progressType,... } */
export function adapt(content: any): NormalizedNode {
  const qs: any[] = Array.isArray(content?.questions) ? content.questions : [];
  const children: NormalizedNode[] = [];
  for (const q of qs) {
    const lib = q?.library;
    const params = q?.params ?? q?.subContentId ?? q;
    if (!lib) continue;
    children.push(adaptH5pSubContent(String(lib), params));
  }
  return {
    id: uniqueId("qset"),
    sourceType: machineName,
    kind: "container",
    children
  };
}
