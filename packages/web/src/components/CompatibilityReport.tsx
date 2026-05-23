import type { CompatibilityEntry } from "@h5p2elpx/core";

type Status = "ok" | "partial" | "no";

const STATUS_LABEL: Record<Status, string> = {
  ok: "Supported",
  partial: "Partial",
  no: "Unsupported"
};

export function CompatibilityReport({ entries }: { entries: CompatibilityEntry[] }) {
  return (
    <div className="compat">
      {entries.map((e) => {
        // Core's CompatibilityEntry only tells us supported/unsupported.
        // We treat boolean=true as "ok", false as "no". Adapters that
        // emit warning items per package would need a richer signal.
        const status: Status = e.supported ? "ok" : "no";
        return (
          <div className="compat-row" key={e.sourceFile}>
            <div className="col-file">
              <span className="ico">H5P</span>
              <span title={e.sourceFile}>{e.sourceFile}</span>
            </div>
            <div className="col-lib">{e.mainLibrary}</div>
            <span className={`badge ${status}`}>{STATUS_LABEL[status]}</span>
          </div>
        );
      })}
    </div>
  );
}
