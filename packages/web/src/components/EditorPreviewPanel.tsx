import { useEffect, useMemo, useRef, useState } from "react";
import { Box } from "./Box.tsx";
import { useI18n } from "../i18n/index.tsx";

type Props = {
  elpx: Uint8Array;
  filename: string;
};

const DEFAULT_EDITOR_URL = "https://static.exelearning.dev/";

type Status = "loading" | "ready" | "sending" | "opened" | "error";

export function EditorPreviewPanel({ elpx, filename }: Props) {
  const { t } = useI18n();
  const editorUrl =
    (import.meta.env.VITE_EXE_EDITOR_URL as string | undefined) || DEFAULT_EDITOR_URL;
  const editorOrigin = useMemo(() => {
    try {
      return new URL(editorUrl).origin;
    } catch {
      return "";
    }
  }, [editorUrl]);
  const editorHost = useMemo(() => {
    try {
      return new URL(editorUrl).host;
    } catch {
      return editorUrl;
    }
  }, [editorUrl]);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setStatus("loading");
    setErrorMsg(null);

    const requestId = `open-${reloadKey}-${Date.now()}`;

    function sendOpenFile() {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;
      // Send a fresh copy so the original buffer remains usable for download.
      const copy = elpx.slice().buffer;
      setStatus("sending");
      iframe.contentWindow.postMessage(
        {
          type: "OPEN_FILE",
          requestId,
          data: { bytes: copy, filename }
        },
        editorOrigin || "*"
      );
    }

    function onMessage(event: MessageEvent) {
      if (editorOrigin && event.origin !== editorOrigin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as {
        type?: string;
        requestId?: string;
        error?: { message?: string };
      } | null;
      if (!data || typeof data.type !== "string") return;

      switch (data.type) {
        case "EXELEARNING_READY":
          setStatus("ready");
          sendOpenFile();
          break;
        case "OPEN_FILE_SUCCESS":
          if (data.requestId === requestId) setStatus("opened");
          break;
        case "OPEN_FILE_ERROR":
          if (data.requestId === requestId) {
            setStatus("error");
            setErrorMsg(data.error?.message ?? "OPEN_FILE_ERROR");
          }
          break;
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [elpx, filename, editorOrigin, reloadKey]);

  function onReload() {
    setReloadKey((k) => k + 1);
  }

  const statusLabel =
    status === "loading"
      ? t("preview.loading")
      : status === "ready"
        ? t("preview.ready")
        : status === "sending"
          ? t("preview.sending")
          : status === "opened"
            ? t("preview.opened")
            : t("preview.openFailed", { msg: errorMsg ?? "" });

  return (
    <Box icon="info" title={t("preview.title")} meta={statusLabel}>
      <p className="preview-intro">
        {t("preview.intro")}{" "}
        <span className="preview-host">{t("preview.poweredBy", { host: editorHost })}</span>
      </p>
      <div className="preview-frame-wrap">
        <iframe
          key={reloadKey}
          ref={iframeRef}
          src={editorUrl}
          title={t("preview.title")}
          className="preview-frame"
          allow="clipboard-read; clipboard-write; fullscreen"
        />
      </div>
      <div className="preview-actions">
        <button type="button" className="btn btn-secondary" onClick={onReload}>
          {t("preview.reload")}
        </button>
      </div>
    </Box>
  );
}
