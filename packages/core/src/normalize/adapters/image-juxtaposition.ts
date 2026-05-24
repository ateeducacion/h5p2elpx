import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.ImageJuxtaposition";

/** H5P.ImageJuxtaposition content.json:
 *   { imageBefore: { labelBefore, imageBefore: { library:"H5P.Image", params:{ alt, file:{path,...} } } },
 *     imageAfter:  { labelAfter,  imageAfter:  { ... } } }
 */
export function adapt(content: any): NormalizedNode {
  const before = content?.imageBefore ?? {};
  const after = content?.imageAfter ?? {};
  const beforeFile = before?.imageBefore?.params?.file?.path;
  const afterFile = after?.imageAfter?.params?.file?.path;
  return {
    id: uniqueId("ij"),
    sourceType: machineName,
    kind: "beforeafter",
    before: {
      src: typeof beforeFile === "string" ? beforeFile : "",
      label: typeof before?.labelBefore === "string" ? before.labelBefore : undefined,
      alt:
        typeof before?.imageBefore?.params?.alt === "string"
          ? before.imageBefore.params.alt
          : undefined
    },
    after: {
      src: typeof afterFile === "string" ? afterFile : "",
      label: typeof after?.labelAfter === "string" ? after.labelAfter : undefined,
      alt:
        typeof after?.imageAfter?.params?.alt === "string" ? after.imageAfter.params.alt : undefined
    }
  };
}
