import { useCallback, useRef, useState } from "react";
import { useI18n } from "../i18n/index.tsx";

type Props = {
  onFiles: (files: File[]) => void;
  files: File[];
  onRemove: (index: number) => void;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function Dropzone({ onFiles, files, onRemove }: Props) {
  const [hover, setHover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  const open = useCallback(() => inputRef.current?.click(), []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setHover(false);
      const dropped = Array.from(e.dataTransfer.files).filter((f) => {
        const n = f.name.toLowerCase();
        return n.endsWith(".h5p") || n.endsWith(".zip");
      });
      if (dropped.length) onFiles(dropped);
    },
    [onFiles]
  );

  return (
    <>
      <button
        type="button"
        className={`dropzone${hover ? " dragover" : ""}`}
        onClick={open}
        onDragEnter={(e) => {
          e.preventDefault();
          setHover(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setHover(true);
        }}
        onDragLeave={() => setHover(false)}
        onDrop={onDrop}
        style={{ width: "100%", font: "inherit" }}
      >
        <div className="dz-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <title>Upload</title>
            <path d="M12 16V4" />
            <path d="M7 9l5-5 5 5" />
            <path d="M20 16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3" />
          </svg>
        </div>
        <p className="dz-title">
          {t("dropzone.dropBefore")}
          <span className="h5p">.h5p</span>
          {t("dropzone.dropAfter")}
        </p>
        <p className="dz-sub">
          {t("dropzone.or")}{" "}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
          >
            {t("dropzone.browse")}
          </button>{" "}
          · {t("dropzone.hint")}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".h5p,.zip"
          multiple
          onChange={(e) => {
            const list = Array.from(e.target.files ?? []);
            if (list.length) onFiles(list);
            e.target.value = "";
          }}
        />
      </button>

      {files.length > 0 && (
        <ul className="file-list">
          {files.map((f, i) => (
            <li className="file-item" key={`${f.name}-${i}`}>
              <span className="ico">H5P</span>
              <span className="name">{f.name}</span>
              <span className="size">{formatBytes(f.size)}</span>
              <button
                type="button"
                className="x"
                onClick={() => onRemove(i)}
                aria-label={t("dropzone.remove", { name: f.name })}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
