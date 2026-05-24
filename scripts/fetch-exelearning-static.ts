#!/usr/bin/env bun
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

const DEFAULT_VERSION = "v4.0.0";
const VERSION = process.env.EXELEARNING_STATIC_VERSION ?? DEFAULT_VERSION;
const DEFAULT_URL = `https://github.com/exelearning/exelearning/releases/download/${VERSION}/exelearning-static-${VERSION}.zip`;
const URL = process.env.EXELEARNING_STATIC_URL ?? DEFAULT_URL;

const OUT_DIR = resolve(ROOT, "packages/web/e2e/server-root/exe");
const VERSION_FILE = join(OUT_DIR, "VERSION");

async function exists(path: string) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function readText(path: string) {
  return await Bun.file(path).text();
}

async function main() {
  if (await exists(VERSION_FILE)) {
    const current = (await readText(VERSION_FILE)).trim();
    if (current === VERSION && !process.env.FORCE) {
      console.log(`eXeLearning static ${VERSION} already present in ${OUT_DIR}`);
      return;
    }
    console.log(`Replacing ${current} with ${VERSION}`);
    await rm(OUT_DIR, { recursive: true, force: true });
  }

  console.log(`Downloading ${URL}`);
  const res = await fetch(URL);
  if (!res.ok) {
    throw new Error(`Failed to download editor: ${res.status} ${res.statusText} (${URL})`);
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  console.log(`Downloaded ${(buf.byteLength / 1024 / 1024).toFixed(1)} MiB`);

  const zip = await JSZip.loadAsync(buf);
  await mkdir(OUT_DIR, { recursive: true });

  // Detect single top-level dir so we can strip it.
  const topLevels = new Set<string>();
  for (const name of Object.keys(zip.files)) {
    const top = name.split("/")[0];
    if (top) topLevels.add(top);
  }
  const stripPrefix = topLevels.size === 1 ? `${[...topLevels][0]}/` : "";

  let written = 0;
  await Promise.all(
    Object.values(zip.files).map(async (entry) => {
      if (entry.dir) return;
      const rel =
        stripPrefix && entry.name.startsWith(stripPrefix)
          ? entry.name.slice(stripPrefix.length)
          : entry.name;
      if (!rel) return;
      const dest = join(OUT_DIR, rel);
      await mkdir(dirname(dest), { recursive: true });
      const content = await entry.async("uint8array");
      await writeFile(dest, content);
      written += 1;
    })
  );

  await writeFile(VERSION_FILE, `${VERSION}\n`);
  console.log(`Extracted ${written} files to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
