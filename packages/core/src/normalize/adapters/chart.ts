import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";
import { escapeHtml } from "../../utils/html.ts";

export const machineName = "H5P.Chart";

export function adapt(content: any): NormalizedNode {
  const figureDefinition =
    typeof content?.figureDefinition === "string" && content.figureDefinition.trim()
      ? content.figureDefinition.trim()
      : "Chart";
  const mode =
    typeof content?.graphMode === "string" && content.graphMode.trim()
      ? content.graphMode.trim()
      : "chart";
  const rows: any[] = Array.isArray(content?.listOfTypes) ? content.listOfTypes : [];

  const tableRows = rows
    .map((row) => {
      const label = typeof row?.text === "string" ? row.text : "";
      const value = row?.value ?? "";
      return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(String(value))}</td></tr>`;
    })
    .join("");

  return {
    id: uniqueId("chart"),
    sourceType: machineName,
    kind: "text",
    html: [
      `<p><strong>${escapeHtml(figureDefinition)}</strong></p>`,
      `<p>Chart type: ${escapeHtml(mode)}</p>`,
      `<table><thead><tr><th>Item</th><th>Value</th></tr></thead><tbody>${tableRows}</tbody></table>`
    ].join("\n")
  };
}
