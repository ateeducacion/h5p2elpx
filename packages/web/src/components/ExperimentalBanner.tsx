import { useEffect, useState } from "react";
import { useI18n } from "../i18n/index.tsx";

const STORAGE_KEY = "h5p2elpx.experimentalDismissed";

export function ExperimentalBanner() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(window.localStorage?.getItem(STORAGE_KEY) !== "1");
    } catch {
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  return (
    <div className="experimental-banner" role="status">
      <svg
        className="experimental-banner-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>Warning</title>
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span className="experimental-banner-text">{t("experimental.warning")}</span>
      <button
        type="button"
        className="experimental-banner-close"
        aria-label={t("experimental.dismiss")}
        onClick={() => {
          setOpen(false);
          try {
            window.localStorage?.setItem(STORAGE_KEY, "1");
          } catch {
            // ignore
          }
        }}
      >
        ×
      </button>
    </div>
  );
}
