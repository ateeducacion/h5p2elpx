/**
 * TypeScript's rewriteRelativeImportExtensions rewrites .ts to .js in
 * emitted JavaScript but intentionally leaves declaration files alone.
 * External consumers resolve types against the published package, so
 * rewrite relative .ts / .tsx import specifiers under dist/ to their
 * JavaScript equivalents.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DIST = new URL("../dist/", import.meta.url);

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.name.endsWith(".d.ts")) yield path;
  }
}

const IMPORT_RE = /(from\s+|import\s*\(\s*)(["'])(\.[^"']+)\.tsx?\2/g;

let files = 0;
let replacements = 0;

for await (const file of walk(DIST.pathname)) {
  const before = await readFile(file, "utf8");
  const after = before.replace(IMPORT_RE, (_m, prefix: string, quote: string, bare: string) => {
    replacements += 1;
    return `${prefix}${quote}${bare}.js${quote}`;
  });
  if (after !== before) {
    await writeFile(file, after);
    files += 1;
  }
}

// stderr so lifecycle hooks do not pollute `npm pack --json` stdout
console.error(
  `fix-dts-extensions: rewrote ${replacements} import(s) in ${files} declaration file(s)`
);
