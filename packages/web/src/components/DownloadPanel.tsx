import React from "react";
import { summarizeReport, type ConversionReport } from "@h5p2elpx/core";

type Props = {
  elpx: Uint8Array;
  report: ConversionReport;
  filename: string;
};

function download(name: string, mime: string, data: BlobPart | Uint8Array) {
  const blob = new Blob([data as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 0);
}

export function DownloadPanel({ elpx, report, filename }: Props) {
  return (
    <div style={{ marginTop: "1.5rem", padding: "1rem", border: "1px solid #ddd", borderRadius: 8 }}>
      <h3>Conversion result</h3>
      <pre style={{ whiteSpace: "pre-wrap", background: "#f6f6f6", padding: "0.75rem", borderRadius: 4 }}>
        {summarizeReport(report)}
      </pre>
      <button onClick={() => download(filename, "application/zip", elpx)} style={{ marginRight: 8 }}>
        Download {filename}
      </button>
      <button onClick={() => download(filename.replace(/\.elpx$/, "") + "-report.json", "application/json", JSON.stringify(report, null, 2))}>
        Download report.json
      </button>
    </div>
  );
}
