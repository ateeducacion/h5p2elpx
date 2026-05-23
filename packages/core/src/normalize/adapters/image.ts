import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.Image";

export function adapt(content: any): NormalizedNode {
  const file = content?.file ?? content?.image?.file ?? content;
  const path = typeof file?.path === "string" ? file.path : "";
  return {
    id: uniqueId("img"),
    sourceType: machineName,
    kind: "image",
    src: path,
    alt: typeof content?.alt === "string" ? content.alt : undefined,
    caption: typeof content?.title === "string" ? content.title : undefined
  };
}
