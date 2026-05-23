import type { NormalizedNode, NormalizedPageNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";
import { adaptH5pSubContent } from "./index.ts";

export const machineName = "H5P.InteractiveBook";

export function adapt(content: any): NormalizedNode {
  const chapters: any[] = Array.isArray(content?.chapters) ? content.chapters : [];
  const pages: NormalizedPageNode[] = chapters.map((chap, idx) => {
    const items: any[] = Array.isArray(chap?.params?.content) ? chap.params.content : [];
    const children: NormalizedNode[] = [];
    for (const it of items) {
      const sub = it?.content;
      const machine = sub?.library;
      if (!sub || !machine) continue;
      children.push(adaptH5pSubContent(String(machine).split(" ")[0]!, sub.params ?? {}));
    }
    return {
      id: uniqueId("chap"),
      sourceType: "H5P.InteractiveBook.Chapter",
      title: typeof chap?.metadata?.title === "string" ? chap.metadata.title : `Chapter ${idx + 1}`,
      kind: "page",
      children
    };
  });
  return {
    id: uniqueId("ibook"),
    sourceType: machineName,
    kind: "container",
    children: pages
  };
}
