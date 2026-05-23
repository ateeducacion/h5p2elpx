import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";
import { adaptH5pSubContent } from "./index.ts";

export const machineName = "H5P.Column";

export function adapt(content: any): NormalizedNode {
  const items: any[] = Array.isArray(content?.content) ? content.content : [];
  const children: NormalizedNode[] = [];
  for (const item of items) {
    const sub = item?.content;
    const machine = sub?.library ?? item?.library;
    if (!sub || !machine) continue;
    children.push(adaptH5pSubContent(String(machine), sub?.params ?? sub));
  }
  return {
    id: uniqueId("col"),
    sourceType: machineName,
    kind: "container",
    children
  };
}
