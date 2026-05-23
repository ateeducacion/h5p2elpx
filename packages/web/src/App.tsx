import { useEffect, useMemo, useState } from "react";
import {
  buildCompatibilityPreview,
  type CompatibilityEntry,
  convert,
  type ConversionReport,
  readH5p
} from "@h5p2elpx/core";
import { Box } from "./components/Box.tsx";
import { CompatibilityReport } from "./components/CompatibilityReport.tsx";
import { ConversionOptionsForm, type UiOptions } from "./components/ConversionOptions.tsx";
import { ConvertBar } from "./components/ConvertBar.tsx";
import { DownloadPanel } from "./components/DownloadPanel.tsx";
import { Dropzone } from "./components/Dropzone.tsx";
import { Footer } from "./components/Footer.tsx";
import { GithubCorner } from "./components/GithubCorner.tsx";
import { Stepper } from "./components/Stepper.tsx";
import { Topbar } from "./components/Topbar.tsx";

const REPO_URL = "https://github.com/ateeducacion/h5p2elpx";

type Conv = {
  elpx: Uint8Array;
  report: ConversionReport;
  outputName: string;
};

export function App() {
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
      .catch((err) => setError(`Could not load eXe template: ${err.message}`));
  }, []);

  async function onFilesDropped(dropped: File[]) {
    const merged = [...files, ...dropped];
    setFiles(merged);
    setConv(null);
    setError(null);
    try {
      const pkgs = await Promise.all(
        merged.map(async (f) =>
          readH5p(new Uint8Array(await f.arrayBuffer()), { sourceFilename: f.name })
        )
      );
      setPreview(buildCompatibilityPreview(pkgs));
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
          kind: "h5p-bytes" as const,
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

  return (
    <>
      <GithubCorner href={REPO_URL} />
      <div className="shell">
        <Topbar githubUrl={REPO_URL} />

        <header className="hero">
          <p className="package-title">Browser tool · 100% client-side</p>
          <h1>
            Convert <span className="accent">H5P</span> to editable{" "}
            <span className="accent">eXeLearning</span>
          </h1>
          <p className="lede">
            Drop a <code>.h5p</code> package and download an <code>.elpx</code> project you can open
            and edit in eXeLearning. Nothing leaves your browser.
          </p>
        </header>

        <Stepper state={{ hasFiles, hasReport }} />

        {error && <div className="error-banner">{error}</div>}

        <Box
          icon="share"
          title="1 · Upload H5P packages"
          meta={hasFiles ? `${files.length} file${files.length > 1 ? "s" : ""} ready` : undefined}
        >
          <Dropzone onFiles={onFilesDropped} files={files} onRemove={onRemoveFile} />
        </Box>

        {hasFiles && (
          <Box
            icon="competencies"
            title="2 · Compatibility preview"
            meta={allOk ? "All files supported" : "Some content needs attention"}
          >
            <CompatibilityReport entries={preview} />
          </Box>
        )}

        {hasFiles && (
          <Box icon="agreement" title="3 · Conversion options">
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

        <Footer />
      </div>
    </>
  );
}
