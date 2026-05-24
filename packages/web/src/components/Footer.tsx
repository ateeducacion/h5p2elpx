import { useI18n } from "../i18n/index.tsx";

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="14" height="14">
      <title>GitHub</title>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.54-3.87-1.54-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.73-1.53-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.35.78 1.05.78 2.12v3.14c0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

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
        {" · "}
        <a href={`${githubUrl}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer">
          {t("footer.licenseLink")}
        </a>
        {" · "}
        <a className="foot-source" href={githubUrl} target="_blank" rel="noopener noreferrer">
          <GithubIcon />
          {t("footer.sourceCode")}
        </a>
      </p>
    </footer>
  );
}
