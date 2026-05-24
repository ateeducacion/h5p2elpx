import { type Lang, SUPPORTED_LANGS, useI18n } from "../i18n/index.tsx";

const LABELS: Record<Lang, string> = {
  en: "English",
  es: "Español"
};

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <label className="lang-switcher">
      <span className="lang-switcher-label">{t("topbar.language")}</span>
      <select
        aria-label={t("topbar.language")}
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
      >
        {SUPPORTED_LANGS.map((l) => (
          <option key={l} value={l}>
            {LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
