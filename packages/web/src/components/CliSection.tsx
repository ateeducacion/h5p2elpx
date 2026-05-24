import { useState } from "react";
import { useI18n } from "../i18n/index.tsx";

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="16"
      height="16"
      className="cli-chevron"
    >
      <title>Chevron</title>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="16"
      height="16"
    >
      <title>Copy</title>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="16"
      height="16"
      className="cli-check-icon"
    >
      <title>Check</title>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="16" height="16">
      <title>GitHub</title>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.54-3.87-1.54-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.73-1.53-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.35.78 1.05.78 2.12v3.14c0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

export function CliSection({ githubUrl }: { githubUrl: string }) {
  const { lang, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const command =
    lang === "es"
      ? [
          "echo '@ateeducacion:registry=https://npm.pkg.github.com' >> .npmrc",
          "bunx --bun @ateeducacion/h5p2elpx convert archivo.h5p -o resultado.elpx"
        ].join("\n")
      : [
          "echo '@ateeducacion:registry=https://npm.pkg.github.com' >> .npmrc",
          "bunx --bun @ateeducacion/h5p2elpx convert file.h5p -o result.elpx"
        ].join("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="cli-section">
      <div className={`cli-accordion ${isOpen ? "is-open" : ""}`}>
        <button
          type="button"
          className="cli-accordion-header"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
        >
          <span className="cli-accordion-title">{t("cli.title")}</span>
          <ChevronIcon />
        </button>

        <div className="cli-accordion-content-wrapper">
          <div className="cli-accordion-content">
            <p className="cli-info-text">{t("cli.installInfo")}</p>
            <p className="cli-info-text">{t("cli.commandLabel")}</p>

            <div className="cli-code-container">
              <pre className="cli-code-block">
                <code className="cli-code">{command}</code>
              </pre>
              <button
                type="button"
                className={`cli-copy-btn ${copied ? "is-copied" : ""}`}
                onClick={handleCopy}
                title={copied ? t("cli.copied") : t("cli.copy")}
                aria-label={copied ? t("cli.copied") : t("cli.copy")}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
                <span className="cli-copy-text">{copied ? t("cli.copied") : t("cli.copy")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="cli-issues">
        <a
          href={`${githubUrl}/issues/new?template=broken-h5p.yml`}
          target="_blank"
          rel="noopener noreferrer"
          className="cli-issues-link"
        >
          <GithubIcon />
          <span className="cli-issues-label">{t("cli.issuesLabel")}</span>{" "}
          <span className="cli-issues-action">{t("cli.issuesLink")}</span>
        </a>
      </div>
    </div>
  );
}
