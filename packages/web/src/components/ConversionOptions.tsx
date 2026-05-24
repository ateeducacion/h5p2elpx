import type { ConversionOptions } from "@ateeducacion/h5p2elpx-core";
import { useI18n } from "../i18n/index.tsx";

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
  const { t } = useI18n();
  const set = <K extends keyof UiOptions>(k: K, v: UiOptions[K]) => onChange({ ...value, [k]: v });

  return (
    <div className="opt-grid">
      <div className="opt">
        <label htmlFor="o-layout">{t("options.layout")}</label>
        <select
          id="o-layout"
          value={value.layout}
          onChange={(e) => set("layout", e.target.value as UiOptions["layout"])}
        >
          <option value="preserve">{t("options.layoutPreserve")}</option>
          <option value="blocks">{t("options.layoutBlocks")}</option>
          <option value="pages">{t("options.layoutPages")}</option>
        </select>
        <p className="hint">{t("options.layoutHint")}</p>
      </div>

      <div className="opt">
        <label htmlFor="o-unsup">{t("options.unsupported")}</label>
        <select
          id="o-unsup"
          value={value.unsupported}
          onChange={(e) => set("unsupported", e.target.value as UiOptions["unsupported"])}
        >
          <option value="keep">{t("options.unsupportedKeep")}</option>
          <option value="text">{t("options.unsupportedText")}</option>
          <option value="drop">{t("options.unsupportedDrop")}</option>
        </select>
        <p className="hint">{t("options.unsupportedHint")}</p>
      </div>

      <div className="opt">
        <label htmlFor="o-title">{t("options.title")}</label>
        <input
          id="o-title"
          type="text"
          placeholder={t("options.titlePlaceholder")}
          value={value.title}
          onChange={(e) => set("title", e.target.value)}
        />
        <p className="hint">{t("options.titleHint")}</p>
      </div>

      <div className="opt">
        <label htmlFor="o-lang">{t("options.language")}</label>
        <input
          id="o-lang"
          type="text"
          placeholder={t("options.languagePlaceholder")}
          value={value.language}
          onChange={(e) => set("language", e.target.value)}
        />
        <p className="hint">
          {t("options.languageHintBefore")}
          <code>content.xml</code>
          {t("options.languageHintAfter")}
        </p>
      </div>

      <div className="opt">
        <label htmlFor="o-theme">{t("options.theme")}</label>
        <select id="o-theme" value={value.theme} onChange={(e) => set("theme", e.target.value)}>
          <option value="base">base</option>
          <option value="nova">nova</option>
          <option value="zen">zen</option>
          <option value="neo">neo</option>
          <option value="flux">flux</option>
          <option value="universal">universal</option>
        </select>
        <p className="hint">{t("options.themeHint")}</p>
      </div>

      <div className="opt">
        <label>{t("options.extras")}</label>
        <label className="opt-toggle" style={{ marginTop: 4 }}>
          <input
            type="checkbox"
            checked={value.enableSearch}
            onChange={(e) => set("enableSearch", e.target.checked)}
          />
          <span>
            <span className="lbl">{t("options.enableSearch")}</span>
            <p className="hint">
              {t("options.enableSearchHintBefore")}
              <code>search_index.js</code>
              {t("options.enableSearchHintAfter")}
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
            <span className="lbl">{t("options.enableMathJax")}</span>
            <p className="hint">{t("options.enableMathJaxHint")}</p>
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
          <span className="lbl">{t("options.includeOriginal")}</span>
          <p className="hint">{t("options.includeOriginalHint")}</p>
        </span>
      </label>
    </div>
  );
}
