import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.Accordion";

/** H5P.Accordion content.json: { panels: [ { title, content: { library:"H5P.AdvancedText", params:{ text } } } ] } */
export function adapt(content: any): NormalizedNode {
  const panels: any[] = Array.isArray(content?.panels) ? content.panels : [];
  const blocks = panels
    .map((p) => {
      const title = typeof p?.title === "string" ? p.title : "";
      const text = typeof p?.content?.params?.text === "string" ? p.content.params.text : "";
      return `<details><summary>${title}</summary>${text}</details>`;
    })
    .join("\n");
  return {
    id: uniqueId("acc"),
    sourceType: machineName,
    kind: "text",
    html: blocks || "<p>(empty accordion)</p>"
  };
}
