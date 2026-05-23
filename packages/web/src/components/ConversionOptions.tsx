import React from "react";
import type { ConversionOptions } from "@h5p2elpx/core";

export type UiOptions = Pick<ConversionOptions, "layout" | "unsupported" | "includeOriginalH5p"> & {
  title: string;
  language: string;
};

type Props = {
  value: UiOptions;
  onChange: (v: UiOptions) => void;
};

export function ConversionOptionsForm({ value, onChange }: Props) {
  const set = <K extends keyof UiOptions>(k: K, v: UiOptions[K]) =>
    onChange({ ...value, [k]: v });
  return (
    <fieldset style={{ marginTop: "1rem", padding: "1rem", border: "1px solid #ddd", borderRadius: 8 }}>
      <legend>Options</legend>
      <label style={{ display: "block", marginBottom: 6 }}>
        Layout:{" "}
        <select value={value.layout} onChange={(e) => set("layout", e.target.value as UiOptions["layout"])}>
          <option value="blocks">blocks (one page)</option>
          <option value="pages">pages (one page per file)</option>
          <option value="preserve">preserve (keep structure)</option>
        </select>
      </label>
      <label style={{ display: "block", marginBottom: 6 }}>
        Unsupported:{" "}
        <select value={value.unsupported} onChange={(e) => set("unsupported", e.target.value as UiOptions["unsupported"])}>
          <option value="keep">keep (warning iDevice)</option>
          <option value="text">text (small notice)</option>
          <option value="drop">drop (omit, still reported)</option>
        </select>
      </label>
      <label style={{ display: "block", marginBottom: 6 }}>
        <input
          type="checkbox"
          checked={value.includeOriginalH5p}
          onChange={(e) => set("includeOriginalH5p", e.target.checked)}
        />{" "}
        Include original .h5p inside the .elpx
      </label>
      <label style={{ display: "block", marginBottom: 6 }}>
        Title:{" "}
        <input value={value.title} onChange={(e) => set("title", e.target.value)} placeholder="Imported H5P content" />
      </label>
      <label style={{ display: "block" }}>
        Language:{" "}
        <input value={value.language} onChange={(e) => set("language", e.target.value)} placeholder="en" />
      </label>
    </fieldset>
  );
}
