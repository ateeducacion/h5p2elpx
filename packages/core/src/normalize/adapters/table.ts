import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.Table";

export function adapt(content: any): NormalizedNode {
  const rows: string[][] = Array.isArray(content?.table) ? content.table : [];
  const html = `<table class="h5p2elpx-table">${rows
    .map(
      (r, idx) =>
        `<tr>${r
          .map((cell) => (idx === 0 ? `<th>${cell ?? ""}</th>` : `<td>${cell ?? ""}</td>`))
          .join("")}</tr>`
    )
    .join("")}</table>`;
  return {
    id: uniqueId("tbl"),
    sourceType: machineName,
    kind: "text",
    html
  };
}
