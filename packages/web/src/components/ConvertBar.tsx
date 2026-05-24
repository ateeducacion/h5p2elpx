import { useI18n } from "../i18n/index.tsx";

type Props = {
  fileCount: number;
  layout: string;
  includeOriginal: boolean;
  busy: boolean;
  onConvert: () => void;
};

function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      style={{ animation: "h5p2elpx-spin 0.8s linear infinite" }}
    >
      <title>Loading</title>
      <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="3" fill="none" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <style>{`@keyframes h5p2elpx-spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

export function ConvertBar({ fileCount, layout, includeOriginal, busy, onConvert }: Props) {
  const { t } = useI18n();
  const middle = fileCount === 1 ? t("convertBar.readyMiddleOne") : t("convertBar.readyMiddleMany");
  return (
    <div className="convert-bar">
      <div className="convert-summary">
        {t("convertBar.readyBefore")}
        <strong>{fileCount}</strong>
        {middle}
        <strong>{layout}</strong>
        {includeOriginal ? t("convertBar.readyEmbedded") : ""}
        {t("convertBar.readyEnd")}
      </div>
      <button
        type="button"
        className="btn btn-primary btn-lg"
        disabled={busy || fileCount === 0}
        onClick={onConvert}
      >
        {busy ? (
          <>
            <Spinner /> {t("convertBar.converting")}
          </>
        ) : (
          <>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <title>Convert</title>
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
            {t("convertBar.convert")}
          </>
        )}
      </button>
    </div>
  );
}
