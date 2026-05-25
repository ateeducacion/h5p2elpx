import type { NormalizedNode, NormalizedPageNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";
import { adaptH5pSubContent } from "./index.ts";

export const machineName = "H5P.DocumentationTool";

/**
 * H5P.DocumentationTool is a multi-page form/document with one chapter per
 * `pagesList` entry. Each chapter is an `H5P.StandardPage` (or one of the
 * H5P.GoalsPage / H5P.GoalsAssessmentPage variants) containing an
 * `elementList` of children — typically `H5P.Image` and `H5P.Text` blocks.
 *
 * Structurally it is `H5P.InteractiveBook` with `pagesList`/`elementList`
 * instead of `chapters`/`content`, so we mirror that adapter: emit one
 * `NormalizedPageNode` per chapter and let `convert.ts`'s `preserve` layout
 * turn each into an eXe page.
 */
export function adapt(content: any): NormalizedNode {
  const chapters: any[] = Array.isArray(content?.pagesList) ? content.pagesList : [];
  const pages: NormalizedPageNode[] = chapters.map((chap, idx) => {
    const items: any[] = Array.isArray(chap?.params?.elementList) ? chap.params.elementList : [];
    const children: NormalizedNode[] = [];
    for (const it of items) {
      const machine = it?.library;
      if (!machine) continue;
      children.push(adaptH5pSubContent(String(machine).split(" ")[0]!, it.params ?? {}));
    }
    return {
      id: uniqueId("dtpage"),
      sourceType: "H5P.DocumentationTool.Page",
      title: typeof chap?.metadata?.title === "string" ? chap.metadata.title : `Page ${idx + 1}`,
      kind: "page",
      children
    };
  });
  return {
    id: uniqueId("dtool"),
    sourceType: machineName,
    kind: "container",
    children: pages
  };
}
