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
  const { converted, partiallyConverted, unsupported, warnings, errors } = report.summary;
  const summaryLine = [
    `${converted} converted`,
    partiallyConverted > 0 ? `${partiallyConverted} partial` : null,
    unsupported > 0 ? `${unsupported} unsupported` : null
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <div className="result">
        <div className="result-icon" aria-hidden="true">
          ✓
        </div>
        <div className="result-text">
          <h3>Conversion complete</h3>
          <p>{summaryLine} — your .elpx is ready.</p>
        </div>
        <div className="result-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => download(filename, "application/zip", elpx)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <title>Download</title>
              <path d="M12 4v12" />
              <path d="M7 11l5 5 5-5" />
              <path d="M5 20h14" />
            </svg>
            Download {filename}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              download(
                filename.replace(/\.elpx$/, "") + "-report.json",
                "application/json",
                JSON.stringify(report, null, 2)
              )
            }
          >
            report.json
          </button>
        </div>
      </div>

      <div className="report-stats">
        <div className="report-stat ok">
          <span className="num">{converted}</span>
          <span className="lbl">Converted</span>
        </div>
        <div className="report-stat warn">
          <span className="num">{partiallyConverted}</span>
          <span className="lbl">Partial</span>
        </div>
        <div className="report-stat">
          <span className="num">{unsupported}</span>
          <span className="lbl">Unsupported</span>
        </div>
        <div className="report-stat warn">
          <span className="num">{warnings}</span>
          <span className="lbl">Warnings</span>
        </div>
        <div className="report-stat err">
          <span className="num">{errors}</span>
          <span className="lbl">Errors</span>
        </div>
      </div>

      <pre className="report">{summarizeReport(report)}</pre>
    </>
  );
}
