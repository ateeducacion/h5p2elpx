import { useI18n } from "../i18n/index.tsx";

export function Footer({ githubUrl }: { githubUrl: string }) {
  const { t } = useI18n();
  return (
    <footer className="foot">
      <p>
        {t("footer.madeWithBefore")}
        <span className="heart">❤</span>
        {t("footer.madeWithMiddle")}
        <a
          href="https://www3.gobiernodecanarias.org/medusa/ecoescuela/ate/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Área de Tecnología Educativa
        </a>
      </p>
      <p className="foot-links">
        {t("footer.licenseBefore")}
        <a href={`${githubUrl}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer">
          {t("footer.licenseLink")}
        </a>
        {" · "}
        <a href={githubUrl} target="_blank" rel="noopener noreferrer">
          {t("footer.sourceOnGithub")}
        </a>
      </p>
    </footer>
  );
}
