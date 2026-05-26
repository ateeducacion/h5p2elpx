import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";
import { adaptH5pSubContent } from "./index.ts";

export const machineName = "H5P.Questionnaire";

/** H5P.Questionnaire content.json: { questionnaireElements: [ { library, params, requiredField } ] } */
export function adapt(content: any): NormalizedNode {
  const items: any[] = Array.isArray(content?.questionnaireElements)
    ? content.questionnaireElements
    : [];
  const children: NormalizedNode[] = [];
  for (const it of items) {
    const lib =
      typeof it?.library === "string"
        ? it.library
        : typeof it?.library?.library === "string"
          ? it.library.library
          : "";
    const params = it?.params ?? it?.library?.params ?? {};
    if (!lib) continue;
    children.push(adaptH5pSubContent(lib, params));
  }
  return {
    id: uniqueId("qn"),
    sourceType: machineName,
    kind: "container",
    children
  };
}
