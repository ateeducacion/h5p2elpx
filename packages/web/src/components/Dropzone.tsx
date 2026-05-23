import React, { useCallback, useState } from "react";

type Props = {
  onFiles: (files: File[]) => void;
  files: File[];
};

export function Dropzone({ onFiles, files }: Props) {
  const [hover, setHover] = useState(false);
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setHover(false);
      const dropped = Array.from(e.dataTransfer.files).filter((f) => f.name.toLowerCase().endsWith(".h5p"));
      if (dropped.length) onFiles(dropped);
    },
    [onFiles]
  );
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={onDrop}
      style={{
        border: `2px dashed ${hover ? "#3b82f6" : "#aaa"}`,
        padding: "2rem",
        textAlign: "center",
        borderRadius: 8,
        background: hover ? "#eff6ff" : "#fafafa"
      }}
    >
      <p style={{ margin: 0 }}>Drag & drop one or more <code>.h5p</code> files here</p>
      <p style={{ margin: "0.5rem 0 0", fontSize: "0.85em" }}>
        or pick:{" "}
        <input
          type="file"
          accept=".h5p"
          multiple
          onChange={(e) => {
            const list = Array.from(e.target.files ?? []);
            if (list.length) onFiles(list);
          }}
        />
      </p>
      {files.length > 0 && (
        <ul style={{ textAlign: "left", marginTop: "1rem" }}>
          {files.map((f) => (
            <li key={f.name}>{f.name} <small>({f.size.toLocaleString()} bytes)</small></li>
          ))}
        </ul>
      )}
    </div>
  );
}
