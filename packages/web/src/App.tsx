import { useEffect, useMemo, useState } from "react";
import {
  buildCompatibilityPreview,
  type CompatibilityEntry,
  convert,
  type ConversionReport,
  readAdc,
  readH5p
} from "@ateeducacion/h5p2elpx-core";
import { Box } from "./components/Box.tsx";
import { CompatibilityReport } from "./components/CompatibilityReport.tsx";
import { ConversionOptionsForm, type UiOptions } from "./components/ConversionOptions.tsx";
import { ConvertBar } from "./components/ConvertBar.tsx";
import { DownloadPanel } from "./components/DownloadPanel.tsx";
import { EditorPreviewPanel } from "./components/EditorPreviewPanel.tsx";
import { Dropzone } from "./components/Dropzone.tsx";
import { ExperimentalBanner } from "./components/ExperimentalBanner.tsx";
import { Footer } from "./components/Footer.tsx";
import { GithubCorner } from "./components/GithubCorner.tsx";
import { Stepper } from "./components/Stepper.tsx";
import { Topbar } from "./components/Topbar.tsx";
import { useI18n } from "./i18n/index.tsx";

const REPO_URL = "https://github.com/ateeducacion/h5p2elpx";

type Conv = {
  elpx: Uint8Array;
  report: ConversionReport;
  outputName: string;
};

export function App() {
  const { t } = useI18n();
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<CompatibilityEntry[]>([]);
  const [options, setOptions] = useState<UiOptions>({
    layout: "preserve",
    unsupported: "keep",
    includeOriginalH5p: false,
    title: "",
    language: "",
    theme: "base",
    enableSearch: true,
    enableMathJax: false
  });
  const [conv, setConv] = useState<Conv | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateBytes, setTemplateBytes] = useState<Uint8Array | undefined>(undefined);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}template.elpx`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error("template.elpx not found"))))
      .then((buf) => setTemplateBytes(new Uint8Array(buf)))
      .catch((err) => setError(t("errors.templateNotFound", { msg: err.message })));
  }, [t]);

  async function onFilesDropped(dropped: File[]) {
    const merged = [...files, ...dropped];
    setFiles(merged);
    setConv(null);
    setError(null);
    try {
      const h5pPkgs: Awaited<ReturnType<typeof readH5p>>[] = [];
      const adcEntries: CompatibilityEntry[] = [];
      for (const f of merged) {
        const bytes = new Uint8Array(await f.arrayBuffer());
        // Try ADC first — its sniffer rejects H5P bundles cleanly, so a
        // negative answer falls through to readH5p.
        const adc = await readAdc(bytes, { sourceFilename: f.name });
        if (adc) {
          adcEntries.push({
            sourceFile: f.name,
            title: adc.title,
            mainLibrary: `ADC.${adc.flavor}`,
            supported: true
          });
        } else {
          h5pPkgs.push(await readH5p(bytes, { sourceFilename: f.name }));
        }
      }
      setPreview([...buildCompatibilityPreview(h5pPkgs), ...adcEntries]);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function onRemoveFile(idx: number) {
    const next = files.filter((_, i) => i !== idx);
    setFiles(next);
    setPreview(preview.filter((_, i) => i !== idx));
    setConv(null);
  }

  async function onConvert() {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const inputs = await Promise.all(
        files.map(async (f) => ({
          kind: "zip-bytes" as const,
          data: new Uint8Array(await f.arrayBuffer()),
          filename: f.name
        }))
      );
      const result = await convert(inputs, {
        layout: options.layout,
        unsupported: options.unsupported,
        includeOriginalH5p: options.includeOriginalH5p,
        title: options.title || undefined,
        language: options.language || undefined,
        strict: false,
        templateBytes,
        theme: options.theme,
        enableSearch: options.enableSearch,
        enableMathJax: options.enableMathJax
      });
      const out = `${(files[0]?.name ?? "output").replace(/\.h5p$/i, "")}.elpx`;
      setConv({ elpx: result.elpx, report: result.report, outputName: out });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const hasFiles = files.length > 0;
  const hasReport = conv !== null;
  const allOk = useMemo(() => preview.length > 0 && preview.every((p) => p.supported), [preview]);

  const filesMeta = hasFiles
    ? files.length === 1
      ? t("meta.filesReadyOne", { count: files.length })
      : t("meta.filesReadyMany", { count: files.length })
    : undefined;

  return (
    <>
      <GithubCorner href={REPO_URL} />
      <ExperimentalBanner />
      <div className="shell">
        <Topbar />

        <header className="hero">
          <p className="package-title">{t("hero.badge")}</p>
          <h1>
            {t("hero.titleBefore")}
            <span className="accent">H5P</span>
            {t("hero.titleMiddle")}
            <span className="accent">eXeLearning</span>
            {t("hero.titleAfter")}
          </h1>
          <p className="lede">
            {t("hero.ledeBefore")}
            <code>.h5p</code>
            {t("hero.ledeMiddle")}
            <code>.elpx</code>
            {t("hero.ledeAfter")}
          </p>
        </header>

        <Stepper state={{ hasFiles, hasReport }} />

        {error && <div className="error-banner">{error}</div>}

        <Box
          icon="share"
          title={t("boxes.upload")}
          meta={filesMeta}
          collapsible
          defaultOpen={!hasReport}
        >
          <Dropzone onFiles={onFilesDropped} files={files} onRemove={onRemoveFile} />
        </Box>

        {hasFiles && (
          <Box
            icon="competencies"
            title={t("boxes.preview")}
            meta={allOk ? t("meta.allOk") : t("meta.someAttention")}
            collapsible
            defaultOpen={false}
          >
            <CompatibilityReport entries={preview} />
          </Box>
        )}

        {hasFiles && (
          <Box icon="agreement" title={t("boxes.options")} collapsible defaultOpen={false}>
            <ConversionOptionsForm value={options} onChange={setOptions} />
          </Box>
        )}

        {hasFiles && (
          <ConvertBar
            fileCount={files.length}
            layout={options.layout}
            includeOriginal={options.includeOriginalH5p}
            busy={busy}
            onConvert={onConvert}
          />
        )}

        {conv && <DownloadPanel elpx={conv.elpx} report={conv.report} filename={conv.outputName} />}

        {conv && (
          <div className="shell-wide-break">
            <EditorPreviewPanel elpx={conv.elpx} filename={conv.outputName} />
          </div>
        )}

        <Footer githubUrl={REPO_URL} />
      </div>
    </>
  );
}
