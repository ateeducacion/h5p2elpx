import type { ConversionOptions } from "@h5p2elpx/core";

export type UiOptions = Pick<ConversionOptions, "layout" | "unsupported" | "includeOriginalH5p"> & {
  title: string;
  language: string;
  theme: string;
  enableSearch: boolean;
  enableMathJax: boolean;
};

type Props = {
  value: UiOptions;
  onChange: (v: UiOptions) => void;
};

export function ConversionOptionsForm({ value, onChange }: Props) {
  const set = <K extends keyof UiOptions>(k: K, v: UiOptions[K]) => onChange({ ...value, [k]: v });

  return (
    <div className="opt-grid">
      <div className="opt">
        <label htmlFor="o-layout">Layout</label>
        <select
          id="o-layout"
          value={value.layout}
          onChange={(e) => set("layout", e.target.value as UiOptions["layout"])}
        >
          <option value="preserve">Preserve — keep H5P structure</option>
          <option value="blocks">Blocks — one page, one block per chunk</option>
          <option value="pages">Pages — one page per file</option>
        </select>
        <p className="hint">How H5P containers map to eXeLearning pages.</p>
      </div>

      <div className="opt">
        <label htmlFor="o-unsup">Unsupported content</label>
        <select
          id="o-unsup"
          value={value.unsupported}
          onChange={(e) => set("unsupported", e.target.value as UiOptions["unsupported"])}
        >
          <option value="keep">Keep — insert a warning iDevice</option>
          <option value="text">Convert to plain text</option>
          <option value="drop">Drop silently</option>
        </select>
        <p className="hint">What to do when an H5P type has no mapping.</p>
      </div>

      <div className="opt">
        <label htmlFor="o-title">Project title</label>
        <input
          id="o-title"
          type="text"
          placeholder="Imported H5P content"
          value={value.title}
          onChange={(e) => set("title", e.target.value)}
        />
        <p className="hint">Shown as the package title in eXeLearning.</p>
      </div>

      <div className="opt">
        <label htmlFor="o-lang">Language</label>
        <input
          id="o-lang"
          type="text"
          placeholder="en, es, fr, ca…"
          value={value.language}
          onChange={(e) => set("language", e.target.value)}
        />
        <p className="hint">
          ISO 639-1 code used in <code>content.xml</code>.
        </p>
      </div>

      <div className="opt">
        <label htmlFor="o-theme">Theme</label>
        <select id="o-theme" value={value.theme} onChange={(e) => set("theme", e.target.value)}>
          <option value="base">base</option>
          <option value="nova">nova</option>
          <option value="zen">zen</option>
          <option value="neo">neo</option>
          <option value="flux">flux</option>
          <option value="universal">universal</option>
        </select>
        <p className="hint">eXeLearning visual theme applied to the exported pages.</p>
      </div>

      <div className="opt">
        <label>Page extras</label>
        <label className="opt-toggle" style={{ marginTop: 4 }}>
          <input
            type="checkbox"
            checked={value.enableSearch}
            onChange={(e) => set("enableSearch", e.target.checked)}
          />
          <span>
            <span className="lbl">Generate search index</span>
            <p className="hint">
              Ships <code>search_index.js</code> so eXe's site search works.
            </p>
          </span>
        </label>
        <label className="opt-toggle" style={{ marginTop: 6 }}>
          <input
            type="checkbox"
            checked={value.enableMathJax}
            onChange={(e) => set("enableMathJax", e.target.checked)}
          />
          <span>
            <span className="lbl">Enable MathJax</span>
            <p className="hint">Renders LaTeX via the MathJax v3 CDN.</p>
          </span>
        </label>
      </div>

      <label className={`opt-toggle full${value.includeOriginalH5p ? " on" : ""}`}>
        <input
          type="checkbox"
          checked={value.includeOriginalH5p}
          onChange={(e) => set("includeOriginalH5p", e.target.checked)}
        />
        <span>
          <span className="lbl">Include the original .h5p inside the .elpx</span>
          <p className="hint">Useful as a backup — the source package travels with the project.</p>
        </span>
      </label>
    </div>
  );
}
