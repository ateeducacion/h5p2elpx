/**
 * Verifies the *built* package contract without relying on monorepo path
 * aliases. Builds (if needed), inspects dist/, packs a tarball, and imports
 * it from a temporary consumer outside the workspace graph.
 */
import { existsSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { makeH5pZip } from "./_helpers.ts";

const execFileAsync = promisify(execFile);
const CORE_ROOT = resolve(__dirname, "..");
const DIST = resolve(CORE_ROOT, "dist");
const TEMPLATE_PATH = resolve(__dirname, "../../../fixtures/elpx/template.elpx");
const hasTemplate = existsSync(TEMPLATE_PATH);
const REPO_ROOT = resolve(CORE_ROOT, "../..");

async function ensureBuilt(): Promise<void> {
  if (!existsSync(join(DIST, "index.js")) || !existsSync(join(DIST, "index.d.ts"))) {
    await execFileAsync("bun", ["run", "build"], { cwd: CORE_ROOT });
  }
}

/** Pack the core package; prefer ignoring lifecycle scripts after ensureBuilt. */
async function packCoreTarball(): Promise<string> {
  try {
    const { stdout } = await execFileAsync("npm", ["pack", "--json", "--ignore-scripts"], {
      cwd: CORE_ROOT
    });
    // Guard against accidental non-JSON prefix/suffix on stdout.
    const start = stdout.indexOf("[");
    const end = stdout.lastIndexOf("]");
    if (start < 0 || end < start) throw new Error(`npm pack did not return JSON: ${stdout}`);
    const parsed = JSON.parse(stdout.slice(start, end + 1)) as Array<{ filename: string }>;
    return join(CORE_ROOT, parsed[0]!.filename);
  } catch {
    await execFileAsync("bun", ["pm", "pack"], { cwd: CORE_ROOT });
    const entries = await readdir(CORE_ROOT);
    const name = entries.find((e) => e.endsWith(".tgz"));
    if (!name) throw new Error("no tarball produced");
    return join(CORE_ROOT, name);
  }
}

async function walkFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walkFiles(path)));
    else out.push(path);
  }
  return out;
}

describe("core package artifacts", () => {
  it("dist/ contains ESM JavaScript and TypeScript declarations", async () => {
    await ensureBuilt();
    expect(existsSync(join(DIST, "index.js"))).toBe(true);
    expect(existsSync(join(DIST, "index.d.ts"))).toBe(true);

    const indexJs = await readFile(join(DIST, "index.js"), "utf8");
    expect(indexJs).toMatch(/export /);
    expect(indexJs).toContain("importH5pAsElpx");
    // No residual .ts import specifiers in runtime JS
    expect(indexJs).not.toMatch(/from\s+["'][^"']+\.ts["']/);

    const indexDts = await readFile(join(DIST, "index.d.ts"), "utf8");
    expect(indexDts).toContain("importH5pAsElpx");
    expect(indexDts).not.toMatch(/from\s+["'][^"']+\.ts["']/);

    const pkg = JSON.parse(await readFile(join(CORE_ROOT, "package.json"), "utf8")) as {
      main: string;
      types: string;
      exports: { ".": { import: string; types: string } };
      files: string[];
    };
    expect(pkg.main).toBe("./dist/index.js");
    expect(pkg.types).toBe("./dist/index.d.ts");
    expect(pkg.exports["."].import).toBe("./dist/index.js");
    expect(pkg.exports["."].types).toBe("./dist/index.d.ts");
    expect(pkg.files).toContain("dist");
    expect(pkg.files).not.toContain("src");
  });

  it("emitted runtime JS has no node: imports and no .ts import paths", async () => {
    await ensureBuilt();
    const files = (await walkFiles(DIST)).filter((f) => f.endsWith(".js"));
    expect(files.length).toBeGreaterThan(10);
    for (const file of files) {
      const src = await readFile(file, "utf8");
      expect(src, file).not.toMatch(/from\s+["']node:/);
      expect(src, file).not.toMatch(/require\(["']node:/);
      expect(src, file).not.toMatch(/from\s+["'][^"']+\.ts["']/);
    }
  });

  it("packed tarball installs and imports outside the monorepo", async () => {
    await ensureBuilt();
    const tmp = await mkdtemp(join(tmpdir(), "h5p2elpx-pkg-"));
    try {
      const tarball = await packCoreTarball();

      await writeFile(
        join(tmp, "package.json"),
        JSON.stringify(
          {
            name: "h5p2elpx-external-consumer",
            type: "module",
            private: true,
            dependencies: {
              "@ateeducacion/h5p2elpx-core": `file:${tarball}`
            }
          },
          null,
          2
        )
      );

      await execFileAsync("bun", ["install"], { cwd: tmp });

      const h5p = await makeH5pZip({
        mainLibrary: "H5P.Text",
        content: { text: "<p>external</p>" }
      });
      const h5pPath = join(tmp, "sample.h5p");
      await writeFile(h5pPath, h5p);

      let templateCopy: string | undefined;
      if (hasTemplate) {
        templateCopy = join(tmp, "template.elpx");
        await writeFile(templateCopy, await readFile(TEMPLATE_PATH));
      }

      const consumerScript = `
import { readFileSync } from "node:fs";
import { importH5pAsElpx, convertToElpxProject, H5pImportError } from "@ateeducacion/h5p2elpx-core";

const h5p = new Uint8Array(readFileSync(${JSON.stringify(h5pPath)}));
${
  hasTemplate
    ? `
const template = new Uint8Array(readFileSync(${JSON.stringify(templateCopy)}));
const result = await importH5pAsElpx(h5p, { filename: "sample.h5p", templateElpx: template });
if (!(result.elpx instanceof Uint8Array)) throw new Error("elpx missing");
if (!result.report || result.report.summary.totalActivities !== 1) throw new Error("report missing");
console.log(JSON.stringify({ ok: true, bytes: result.elpx.byteLength, converted: result.report.summary.converted }));
`
    : `
const stage = await convertToElpxProject([{ kind: "h5p-bytes", data: h5p, filename: "sample.h5p" }]);
if (!stage.project.pages.length) throw new Error("no pages");
console.log(JSON.stringify({ ok: true, pages: stage.project.pages.length }));
`
}
`;
      const scriptPath = join(tmp, "run.mjs");
      await writeFile(scriptPath, consumerScript);
      const { stdout } = await execFileAsync("bun", [scriptPath], { cwd: tmp });
      const payload = JSON.parse(stdout.trim()) as { ok: boolean };
      expect(payload.ok).toBe(true);

      // Clean up tarball from package root
      await rm(tarball, { force: true });
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }, 120_000);

  it("Vite can bundle the packed package for the browser", async () => {
    await ensureBuilt();
    const tmp = await mkdtemp(join(tmpdir(), "h5p2elpx-vite-"));
    let tarball = "";
    try {
      tarball = await packCoreTarball();

      await writeFile(
        join(tmp, "package.json"),
        JSON.stringify(
          {
            name: "h5p2elpx-vite-consumer",
            type: "module",
            private: true,
            dependencies: {
              "@ateeducacion/h5p2elpx-core": `file:${tarball}`
            },
            devDependencies: {
              vite: "^6.0.0"
            }
          },
          null,
          2
        )
      );
      await writeFile(
        join(tmp, "index.html"),
        `<!doctype html><html><body><script type="module" src="/main.js"></script></body></html>`
      );
      await writeFile(
        join(tmp, "main.js"),
        `import { importH5pAsElpx, H5P_IMPORT_DEFAULTS } from "@ateeducacion/h5p2elpx-core";
window.__h5p2elpx = { importH5pAsElpx, H5P_IMPORT_DEFAULTS };
`
      );
      await writeFile(
        join(tmp, "vite.config.js"),
        `import { defineConfig } from "vite";
export default defineConfig({ build: { outDir: "dist", write: true } });
`
      );

      await execFileAsync("bun", ["install"], { cwd: tmp });
      // Use the monorepo's vite if install of vite fails to fetch; prefer local.
      try {
        await execFileAsync("bunx", ["vite", "build"], { cwd: tmp });
      } catch {
        // Fall back to repo vite binary
        const viteBin = join(REPO_ROOT, "node_modules", ".bin", "vite");
        if (existsSync(viteBin)) {
          await execFileAsync(viteBin, ["build"], { cwd: tmp });
        } else {
          throw new Error("vite build failed and no monorepo vite binary found");
        }
      }
      const distFiles = await walkFiles(join(tmp, "dist"));
      expect(distFiles.some((f) => f.endsWith(".js"))).toBe(true);
    } finally {
      if (tarball) await rm(tarball, { force: true });
      await rm(tmp, { recursive: true, force: true });
    }
  }, 180_000);
});
