import { useEffect, useState } from "react";
import { Dropzone } from "./components/Dropzone.tsx";
import { ConversionOptionsForm, type UiOptions } from "./components/ConversionOptions.tsx";
import { CompatibilityReport } from "./components/CompatibilityReport.tsx";
import { DownloadPanel } from "./components/DownloadPanel.tsx";
import { Footer } from "./components/Footer.tsx";
import { Topbar } from "./components/Topbar.tsx";
import {
  convert,
  readH5p,
  buildCompatibilityPreview,
  type CompatibilityEntry,
  type ConversionReport
} from "@h5p2elpx/core";

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
    language: ""
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
    setFiles(dropped);
    setConv(null);
    setError(null);
    try {
      const pkgs = await Promise.all(
        dropped.map(async (f) =>
          readH5p(new Uint8Array(await f.arrayBuffer()), { sourceFilename: f.name })
        )
      );
      setPreview(buildCompatibilityPreview(pkgs));
    } catch (err) {
      setError((err as Error).message);
    }
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
        templateBytes
      });
      const out = `${(files[0]?.name ?? "output").replace(/\.h5p$/i, "")}.elpx`;
      setConv({ elpx: result.elpx, report: result.report, outputName: out });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: 880,
        margin: "2rem auto",
        padding: "0 1rem"
      }}
    >
      <Topbar githubUrl="https://github.com/ateeducacion/h5p2elpx" />
      <header style={{ margin: "0 0 32px" }}>
        <p
          style={{
            margin: "0 0 4px",
            fontSize: "0.85rem",
            fontWeight: 300,
            color: "#666",
            textTransform: "uppercase",
            letterSpacing: "0.12em"
          }}
        >
          Browser tool · 100% client-side
        </p>
        <h1
          style={{
            margin: "0 0 12px",
            color: "#078e8e",
            fontSize: "clamp(2rem, 4vw, 2.6rem)",
            fontWeight: 400,
            lineHeight: 1.15,
            letterSpacing: "-0.01em"
          }}
        >
          Convert <span style={{ color: "#054d4d" }}>H5P</span> to editable{" "}
          <span style={{ color: "#054d4d" }}>eXeLearning</span>
        </h1>
        <p style={{ margin: 0, color: "#555", fontSize: "1.05rem" }}>
          Drop a <code>.h5p</code> package and download an <code>.elpx</code> project you can open
          and edit in eXeLearning. Nothing leaves your browser.
        </p>
      </header>
      <Dropzone onFiles={onFilesDropped} files={files} />
      {preview.length > 0 && <CompatibilityReport entries={preview} />}
      <ConversionOptionsForm value={options} onChange={setOptions} />
      <button
        onClick={onConvert}
        disabled={busy || files.length === 0}
        style={{ marginTop: "1rem", padding: "0.6rem 1.2rem" }}
      >
        {busy ? "Converting…" : "Convert"}
      </button>
      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      {conv && <DownloadPanel elpx={conv.elpx} report={conv.report} filename={conv.outputName} />}
      <Footer />
    </main>
  );
}
