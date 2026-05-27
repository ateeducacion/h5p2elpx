import { summarizeReport, type ConversionReport } from "@ateeducacion/h5p2elpx-core";
import { useI18n } from "../i18n/index.tsx";

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
  const { t } = useI18n();
  const { converted, partiallyConverted, unsupported, warnings, errors } = report.summary;
  const summaryLine = [
    t("download.converted", { n: converted }),
    partiallyConverted > 0 ? t("download.partial", { n: partiallyConverted }) : null,
    unsupported > 0 ? t("download.unsupported", { n: unsupported }) : null
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
          <h3>{t("download.complete")}</h3>
          <p>
            {summaryLine}
            {t("download.summaryAfter")}
          </p>
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
            {t("download.downloadBtn", { filename })}
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
            {t("download.reportBtn")}
          </button>
        </div>
      </div>

      <div className="report-stats">
        <div className="report-stat ok">
          <span className="num">{converted}</span>
          <span className="lbl">{t("download.statConverted")}</span>
        </div>
        <div className="report-stat warn">
          <span className="num">{partiallyConverted}</span>
          <span className="lbl">{t("download.statPartial")}</span>
        </div>
        <div className="report-stat">
          <span className="num">{unsupported}</span>
          <span className="lbl">{t("download.statUnsupported")}</span>
        </div>
        <div className="report-stat warn">
          <span className="num">{warnings}</span>
          <span className="lbl">{t("download.statWarnings")}</span>
        </div>
        <div className="report-stat err">
          <span className="num">{errors}</span>
          <span className="lbl">{t("download.statErrors")}</span>
        </div>
      </div>

      <details className="report-details">
        <summary className="report-summary">
          {t("download.logToggle")}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="14"
            height="14"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <pre className="report report-body">{summarizeReport(report)}</pre>
      </details>
    </>
  );
}
