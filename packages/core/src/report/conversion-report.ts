import { TOOL_VERSION } from "../version.ts";

export type UnsupportedItemReport = {
  sourceType: string;
  path?: string;
  reason: string;
};

export type ConversionActivityReport = {
  sourceFile: string;
  title?: string;
  mainLibrary: string;
  status: "converted" | "partial" | "unsupported" | "error";
  mappedTo?: string[];
  unsupportedItems: UnsupportedItemReport[];
  warnings: string[];
  errors: string[];
};

export type ConversionReport = {
  tool: "h5p2elpx";
  version: string;
  input: { files: string[] };
  output: { file?: string; format: "elpx" };
  summary: {
    totalActivities: number;
    converted: number;
    partiallyConverted: number;
    unsupported: number;
    warnings: number;
    errors: number;
  };
  activities: ConversionActivityReport[];
};

export function emptyReport(inputFiles: string[]): ConversionReport {
  return {
    tool: "h5p2elpx",
    version: TOOL_VERSION,
    input: { files: inputFiles },
    output: { format: "elpx" },
    summary: {
      totalActivities: 0,
      converted: 0,
      partiallyConverted: 0,
      unsupported: 0,
      warnings: 0,
      errors: 0
    },
    activities: []
  };
}

export function summarizeReport(report: ConversionReport): string {
  const lines: string[] = [];
  lines.push("h5p2elpx conversion report");
  lines.push("");
  lines.push(`Input: ${report.input.files.join(", ")}`);
  if (report.output.file) lines.push(`Output: ${report.output.file}`);
  lines.push("");
  lines.push(`Converted: ${report.summary.converted}`);
  lines.push(`Partially converted: ${report.summary.partiallyConverted}`);
  lines.push(`Unsupported: ${report.summary.unsupported}`);
  lines.push(`Warnings: ${report.summary.warnings}`);
  lines.push(`Errors: ${report.summary.errors}`);

  const unsupportedItems = report.activities.flatMap((a) =>
    a.unsupportedItems.map((u) => `- ${u.sourceType}: ${u.reason}`)
  );
  if (unsupportedItems.length > 0) {
    lines.push("");
    lines.push("Unsupported content:");
    lines.push(...unsupportedItems);
  }
  return lines.join("\n");
}
