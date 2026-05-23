import React from "react";
import type { CompatibilityEntry } from "@h5p2elpx/core";

export function CompatibilityReport({ entries }: { entries: CompatibilityEntry[] }) {
  return (
    <div style={{ marginTop: "1rem" }}>
      <h3>Compatibility preview</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>File</th>
            <th style={th}>Main H5P library</th>
            <th style={th}>Supported</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.sourceFile}>
              <td style={td}>{e.sourceFile}</td>
              <td style={td}>{e.mainLibrary}</td>
              <td style={{ ...td, color: e.supported ? "green" : "#a16207" }}>
                {e.supported ? "yes" : "fallback"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = {
  borderBottom: "1px solid #ccc",
  textAlign: "left",
  padding: "4px 6px"
};
const td: React.CSSProperties = { borderBottom: "1px solid #eee", padding: "4px 6px" };
