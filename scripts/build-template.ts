#!/usr/bin/env bun
/**
 * Build fixtures/elpx/template.elpx from the official eXeLearning static
 * bundle published as a release asset on github.com/exelearning/exelearning.
 *
 * The release asset `exelearning-static-vX.Y.Z.zip` contains
 * `static/bundles/{idevices,libs,common,content-css}.zip` and
 * `static/bundles/themes/<theme>.zip` — exactly the runtime pieces an
 * authored .elpx ships at its root. We assemble them under the right
 * top-level layout so the produced template, after content.xml is
 * injected by the writer, opens in eXeLearning with the converted pages
 * visible.
 *
 *   Usage:  bun run scripts/build-template.ts [tag] [theme]
 *           bun run scripts/build-template.ts v4.0.0 base
 */
import { writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const OUT_PATH = resolve(ROOT, "fixtures/elpx/template.elpx");
const CACHE_PATH = resolve(ROOT, "node_modules/.cache/h5p2elpx");

const REPO = "exelearning/exelearning";
const DEFAULT_TAG = process.argv[2] ?? "v4.0.0";
const DEFAULT_THEME = process.argv[3] ?? "base";

async function fetchRelease(tag: string): Promise<string> {
  if (tag === "latest") {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`);
    const json: any = await r.json();
    return json.tag_name;
  }
  return tag;
}

async function findStaticAsset(tag: string): Promise<string> {
  const r = await fetch(`https://api.github.com/repos/${REPO}/releases/tags/${tag}`);
  if (!r.ok) throw new Error(`No release ${tag} on ${REPO}`);
  const json: any = await r.json();
  const asset = (json.assets ?? []).find((a: any) => /^exelearning-static-v.*\.zip$/.test(a.name));
  if (!asset) throw new Error(`No exelearning-static-*.zip asset on ${tag}`);
  return asset.browser_download_url;
}

async function download(url: string): Promise<Uint8Array> {
  await mkdir(CACHE_PATH, { recursive: true });
  const cacheKey = resolve(CACHE_PATH, encodeURIComponent(url));
  if (existsSync(cacheKey)) {
    return new Uint8Array(await Bun.file(cacheKey).arrayBuffer());
  }
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to download ${url}: ${r.status}`);
  const bytes = new Uint8Array(await r.arrayBuffer());
  await writeFile(cacheKey, bytes);
  return bytes;
}

async function copyInto(dest: JSZip, source: JSZip, prefix: string, sourcePrefix = "") {
  const entries: Array<{ path: string; file: JSZip.JSZipObject }> = [];
  source.forEach((path, file) => {
    if (!file.dir) entries.push({ path, file });
  });
  for (const { path, file } of entries) {
    if (sourcePrefix && !path.startsWith(sourcePrefix)) continue;
    const rel = sourcePrefix ? path.slice(sourcePrefix.length) : path;
    const data = new Uint8Array(await file.async("arraybuffer"));
    dest.file(prefix + rel, data);
  }
}

const PLACEHOLDER_INDEX = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Open this in eXeLearning</title></head>
<body>
  <h1>h5p2elpx — eXeLearning project</h1>
  <p>This <code>.elpx</code> is meant to be opened in
    <a href="https://github.com/exelearning/exelearning/releases">eXeLearning</a>.
    On import it will regenerate this page and one per converted H5P file.</p>
</body>
</html>
`;

const EMPTY_CONTENT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ode SYSTEM "content.dtd">
<ode xmlns="http://www.intef.es/xsd/ode" version="2.0">
  <userPreferences><userPreference><key>theme</key><value>base</value></userPreference></userPreferences>
  <odeResources/>
  <odeProperties/>
  <odeNavStructures/>
</ode>
`;

const CONTENT_DTD = `<!ELEMENT ode (userPreferences?, odeResources?, odeProperties?, odeNavStructures)>
<!ATTLIST ode xmlns CDATA #FIXED "http://www.intef.es/xsd/ode" version CDATA #IMPLIED>
<!ELEMENT userPreferences (userPreference*)>
<!ELEMENT userPreference (key, value)>
<!ELEMENT odeResources (odeResource*)>
<!ELEMENT odeResource (key, value)>
<!ELEMENT odeProperties (odeProperty*)>
<!ELEMENT odeProperty (key, value)>
<!ELEMENT key (#PCDATA)>
<!ELEMENT value (#PCDATA)>
<!ELEMENT odeNavStructures (odeNavStructure*)>
<!ELEMENT odeNavStructure (odePageId, odeParentPageId, pageName, odeNavStructureOrder, odeNavStructureProperties?, odePagStructures?)>
<!ELEMENT odePageId (#PCDATA)>
<!ELEMENT odeParentPageId (#PCDATA)>
<!ELEMENT pageName (#PCDATA)>
<!ELEMENT odeNavStructureOrder (#PCDATA)>
<!ELEMENT odeNavStructureProperties (odeNavStructureProperty*)>
<!ELEMENT odeNavStructureProperty (key, value)>
<!ELEMENT odePagStructures (odePagStructure*)>
<!ELEMENT odePagStructure (odePageId, odeBlockId, blockName, iconName?, odePagStructureOrder, odePagStructureProperties?, odeComponents?)>
<!ELEMENT odeBlockId (#PCDATA)>
<!ELEMENT blockName (#PCDATA)>
<!ELEMENT iconName (#PCDATA)>
<!ELEMENT odePagStructureOrder (#PCDATA)>
<!ELEMENT odePagStructureProperties (odePagStructureProperty*)>
<!ELEMENT odePagStructureProperty (key, value)>
<!ELEMENT odeComponents (odeComponent*)>
<!ELEMENT odeComponent (odePageId, odeBlockId, odeIdeviceId, odeIdeviceTypeName, htmlView?, jsonProperties?, odeComponentsOrder, odeComponentsProperties?)>
<!ELEMENT odeIdeviceId (#PCDATA)>
<!ELEMENT odeIdeviceTypeName (#PCDATA)>
<!ELEMENT htmlView (#PCDATA)>
<!ELEMENT jsonProperties (#PCDATA)>
<!ELEMENT odeComponentsOrder (#PCDATA)>
<!ELEMENT odeComponentsProperties (odeComponentsProperty*)>
<!ELEMENT odeComponentsProperty (key, value)>
`;

async function main() {
  const tag = await fetchRelease(DEFAULT_TAG);
  console.log(`eXeLearning release: ${tag}`);
  const assetUrl = await findStaticAsset(tag);
  console.log(`Downloading ${assetUrl} (cached)`);
  const staticZipBytes = await download(assetUrl);
  const staticZip = await JSZip.loadAsync(staticZipBytes);

  // Helper to pull a nested bundle out of the static zip and load it.
  async function loadBundle(name: string): Promise<JSZip> {
    const f = staticZip.file(`static/bundles/${name}`);
    if (!f) throw new Error(`Missing bundle: ${name}`);
    const buf = await f.async("arraybuffer");
    return JSZip.loadAsync(new Uint8Array(buf));
  }

  const idevices = await loadBundle("idevices.zip");
  const libs = await loadBundle("libs.zip");
  const common = await loadBundle("common.zip");
  const contentCss = await loadBundle("content-css.zip");

  // Discover and bundle every theme zip available in the upstream
  // release, so the writer can pick one at conversion time.
  const themeNames: string[] = [];
  staticZip.forEach((path) => {
    const m = path.match(/^static\/bundles\/themes\/([^/]+)\.zip$/);
    if (m?.[1]) themeNames.push(m[1]);
  });
  console.log(`Bundling themes: ${themeNames.join(", ")}`);
  const themes: Record<string, JSZip> = {};
  for (const name of themeNames) {
    themes[name] = await loadBundle(`themes/${name}.zip`);
  }
  // Default theme files at theme/ (so the template renders out of the
  // box without a writer pass). Writer will overwrite with the chosen
  // one and drop the staging themes/ dir.
  const defaultTheme = themes[DEFAULT_THEME] ?? themes[themeNames[0] ?? "base"];
  if (!defaultTheme) throw new Error("No themes found in upstream bundle");

  const template = new JSZip();
  await copyInto(template, idevices, "idevices/");
  await copyInto(template, libs, "libs/");
  await copyInto(template, common, "html/");
  // content-css.zip already contains `content/css/...`
  await copyInto(template, contentCss, "");
  await copyInto(template, defaultTheme, "theme/");
  // Stage every theme under themes/<name>/ for runtime selection.
  for (const [name, zip] of Object.entries(themes)) {
    await copyInto(template, zip, `themes/${name}/`);
  }

  template.file("index.html", PLACEHOLDER_INDEX);
  template.file("content.xml", EMPTY_CONTENT_XML);
  template.file("content.dtd", CONTENT_DTD);
  template.file(
    "h5p2elpx-template.json",
    JSON.stringify(
      {
        builtBy: "scripts/build-template.ts",
        source: assetUrl,
        exelearningTag: tag,
        defaultTheme: DEFAULT_THEME,
        availableThemes: themeNames,
        builtAt: new Date().toISOString()
      },
      null,
      2
    )
  );

  await rm(OUT_PATH, { force: true });
  await mkdir(dirname(OUT_PATH), { recursive: true });
  const bytes = await template.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
  await writeFile(OUT_PATH, bytes);
  console.log(`Wrote ${OUT_PATH} (${(bytes.byteLength / 1024).toFixed(1)} KiB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
