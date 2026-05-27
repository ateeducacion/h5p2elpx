import JSZip from "jszip";
import type { AdcFlavor } from "./types.ts";

export type AdcSniffResult = {
  flavor: AdcFlavor;
  /** True when the package ships project.json / components.json in plain text. */
  hasPlainJson: boolean;
  /** True when index.html carries a `ntxCafCompressed` blob we can fall back to. */
  hasNtxCaf: boolean;
};

const NTX_RE = /ntxCafCompressed\s*=\s*"[^"]+"/;

export async function sniffAdcZip(data: Uint8Array | ArrayBuffer): Promise<AdcSniffResult | null> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    return null;
  }
  return sniffLoadedZip(zip);
}

export async function sniffLoadedZip(zip: JSZip): Promise<AdcSniffResult | null> {
  const has = (name: string) => zip.file(name) !== null;

  // Native ADC export (Aula Digital Canaria, "Content" authoring tool).
  if (has("courseInfo.xml") && has("unitCourseData.json")) {
    return { flavor: "native", hasPlainJson: false, hasNtxCaf: false };
  }

  const hasProject = has("project.json");
  const indexHtmlFile = zip.file("index.html");
  let hasNtxCaf = false;
  if (indexHtmlFile) {
    const text = await indexHtmlFile.async("string");
    hasNtxCaf = NTX_RE.test(text);
  }

  if (!hasProject && !hasNtxCaf) return null;

  let flavor: AdcFlavor;
  if (has("tincan.xml")) flavor = "xapi";
  else if (has("imsmanifest.xml")) {
    // Tell the SCORM variants apart by the IMS/ADL namespaces declared in
    // the manifest. The plain ADC zip has no schemaLocation.
    const manifestText = await zip.file("imsmanifest.xml")!.async("string");
    if (/adlcp_v1p3|imscp_v1p1|2004/.test(manifestText)) flavor = "scorm2004";
    else if (/adlcp_rootv1p2|imscp_rootv1p1p2/.test(manifestText)) flavor = "scorm12";
    else flavor = "zip";
  } else if (hasProject) {
    flavor = "local";
  } else {
    flavor = "ntx";
  }
  return { flavor, hasPlainJson: hasProject, hasNtxCaf };
}
