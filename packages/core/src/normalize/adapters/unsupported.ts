import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export function adaptUnsupported(machine: string, originalData: unknown): NormalizedNode {
  return {
    id: uniqueId("uns"),
    sourceType: machine,
    kind: "unsupported",
    reason: `No adapter implemented for ${machine}`,
    originalLibrary: machine,
    originalData
  };
}
