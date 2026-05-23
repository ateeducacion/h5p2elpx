/**
 * Wrap an arbitrary string in a CDATA section, safely splitting any embedded `]]>`
 * sequence so the resulting XML remains well-formed.
 *
 * `]]>` becomes `]]]]><![CDATA[>` — the closing terminator is split between two
 * CDATA sections so no parser sees a real end-of-section.
 */
export function wrapCdata(value: string): string {
  const safe = (value ?? "").replace(/]]>/g, "]]]]><![CDATA[>");
  return `<![CDATA[${safe}]]>`;
}

/** Returns the inner string only, with the same `]]>` splitting applied. */
export function escapeCdataInner(value: string): string {
  return (value ?? "").replace(/]]>/g, "]]]]><![CDATA[>");
}
