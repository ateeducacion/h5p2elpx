import type { CompatibilityEntry } from "@ateeducacion/h5p2elpx-core";
import { useI18n } from "../i18n/index.tsx";

type Status = "ok" | "partial" | "no";

export function CompatibilityReport({ entries }: { entries: CompatibilityEntry[] }) {
  const { t } = useI18n();
  return (
    <div className="compat">
      {entries.map((e) => {
        // Core's CompatibilityEntry only tells us supported/unsupported.
        const status: Status = e.supported ? "ok" : "no";
        return (
          <div className="compat-row" key={e.sourceFile}>
            <div className="col-file">
              <span className="ico">H5P</span>
              <span title={e.sourceFile}>{e.sourceFile}</span>
            </div>
            <div className="col-lib">{e.mainLibrary}</div>
            <span className={`badge ${status}`}>{t(`compat.${status}`)}</span>
          </div>
        );
      })}
    </div>
  );
}
