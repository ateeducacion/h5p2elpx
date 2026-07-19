# Library API — `@ateeducacion/h5p2elpx-core`

Browser-safe conversion library for embedding H5P import into eXeLearning
(or any host that can supply bytes and consume a ZIP).

## Install

Published to **GitHub Packages** as `@ateeducacion/h5p2elpx-core`:

```bash
echo "@ateeducacion:registry=https://npm.pkg.github.com" >> .npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> .npmrc
bun add @ateeducacion/h5p2elpx-core
# or: npm install @ateeducacion/h5p2elpx-core
```

The token needs at least `read:packages` (and SSO authorization if the org
requires it). For CI installs from a private package, use
`GITHUB_TOKEN` / a PAT with `read:packages`.

The package exports compiled ESM under `dist/` with TypeScript declarations.
Production `exports` never point at TypeScript source.

### Publishing (maintainers)

Releases are published by `.github/workflows/publish-packages.yml` when a
GitHub Release is published (or via workflow_dispatch with a version).

That workflow:

1. Sets versions on root / core / cli / web
2. Builds `packages/core` to `dist/`
3. Verifies exports point at compiled files
4. Publishes `@ateeducacion/h5p2elpx-core` then `@ateeducacion/h5p2elpx` to
   `https://npm.pkg.github.com` with `packages: write`

```bash
# Manual publish trigger (example)
gh workflow run publish-packages.yml -f version=0.1.0
# or create a GitHub Release tagged v0.1.0
```

## Public surface

### High-level: `importH5pAsElpx`

```ts
import {
  importH5pAsElpx,
  H5pImportError,
  H5P_IMPORT_DEFAULTS,
  type H5pImportOptions,
  type H5pImportResult,
  type H5pImportErrorCode
} from "@ateeducacion/h5p2elpx-core";

function importH5pAsElpx(
  data: Uint8Array | ArrayBuffer,
  options: H5pImportOptions
): Promise<H5pImportResult>;
```

```ts
type H5pImportOptions = {
  filename: string; // required — used in reports and original embedding
  title?: string;
  language?: string;
  layout?: "blocks" | "pages" | "preserve";
  unsupported?: "keep" | "text" | "drop";
  includeOriginalH5p?: boolean;
  strict?: boolean;
  enableSearch?: boolean;
  enableMathJax?: boolean;
  theme?: string;
  templateElpx: Uint8Array | ArrayBuffer; // required
};

type H5pImportResult = {
  elpx: Uint8Array;
  project: ElpxProject;
  report: ConversionReport;
};
```

Defaults (`H5P_IMPORT_DEFAULTS`) — **only** for this wrapper:

| Field | Value |
| --- | --- |
| `layout` | `"preserve"` |
| `unsupported` | `"keep"` |
| `includeOriginalH5p` | `true` |
| `strict` | `false` |
| `enableSearch` | `false` |
| `enableMathJax` | `false` |

These do **not** change `DEFAULT_OPTIONS` used by `convert()` / CLI / web.

### Lower-level: project stage

```ts
function convertToElpxProject(
  inputs: ConvertInput[],
  options?: Partial<ConversionOptions>
): Promise<ConvertToProjectResult>;

// Alias kept for issue #34 naming (same implementation; accepts H5P and ADC).
const convertH5pToElpxProject = convertToElpxProject;
```

`ConvertToProjectResult` contains `project`, `report`, optional
`originalH5pPackages`, and the resolved `options`. No ZIP is written.

### Compatibility: `convert`

```ts
function convert(
  inputs: ConvertInput[],
  options?: Partial<ConversionOptions>
): Promise<ConvertResult>; // { elpx, project, report }
```

Implemented as `convertToElpxProject` + `writeElpx`. Template bytes remain
optional here (bare ZIP fallback) for CLI/legacy callers.

### Writer

```ts
function writeElpx(
  project: ElpxProject,
  options?: {
    templateBytes?: Uint8Array;
    originalH5pPackages?: Array<{ name: string; data: Uint8Array }>;
    theme?: string;
    enableSearch?: boolean;
    enableMathJax?: boolean;
  }
): Promise<Uint8Array>;
```

## Template strategy

**Approach A — host-provided template.**

`importH5pAsElpx` requires `templateElpx`. eXeLearning should pass a template
built for the same static runtime it ships (same major/minor as its
`exelearning-static` bundle). Mismatched templates may open but can break
idevice runtimes or themes.

How to obtain a template in this monorepo:

```bash
make template   # downloads upstream static zip → fixtures/elpx/template.elpx
```

The web app loads `template.elpx` from its static assets at runtime — hosts
should do the same with their own versioned asset.

## Errors

`H5pImportError` carries:

| Code | Meaning |
| --- | --- |
| `INVALID_H5P` | Not a readable H5P package (bad ZIP, missing `h5p.json` / `content.json`, …) |
| `INVALID_OPTIONS` | Missing/empty `filename`, etc. |
| `TEMPLATE_REQUIRED` | Missing or empty `templateElpx` |
| `INVALID_TEMPLATE` | Template bytes are not a usable `.elpx` ZIP |
| `UNSUPPORTED_CONTENT` | Strict mode hit unsupported/partial content |
| `ELPX_WRITE_FAILED` | ZIP generation failed for other reasons |
| `CONVERSION_FAILED` | Unexpected conversion failure |

Partial conversion in non-strict mode does **not** throw; inspect
`result.report.summary` and `activities[].unsupportedItems`.

## Browser example (downloadable Blob)

```ts
const templateElpx = new Uint8Array(
  await fetch(`${baseUrl}/template.elpx`).then((r) => r.arrayBuffer())
);

const file = /* File from <input type="file" accept=".h5p"> */;
const { elpx, report } = await importH5pAsElpx(await file.arrayBuffer(), {
  filename: file.name,
  templateElpx
});

const url = URL.createObjectURL(new Blob([elpx], { type: "application/zip" }));
const a = document.createElement("a");
a.href = url;
a.download = file.name.replace(/\.h5p$/i, ".elpx");
a.click();
URL.revokeObjectURL(url);
```

## Architecture

```text
H5P/ADC bytes
  → read / normalize
  → convertToElpxProject  → ElpxProject + ConversionReport
  → writeElpx             → .elpx Uint8Array
```

`importH5pAsElpx` is a thin H5P-only facade over that pipeline with
eXe-oriented defaults and mandatory template bytes.

## Memory and security

- Entire conversion is in-memory via JSZip (`loadAsync` / `generateAsync` with
  `type: "uint8array"`). Peak memory scales with package size.
- Core never writes user-controlled paths to disk.
- Hosts should treat untrusted `.h5p` uploads carefully (size limits, timeouts).
- Filenames from the host are used in reports and as archive entry names under
  `content/resources/original/`; prefer basename-only values.

## Compatibility

| Consumer | API |
| --- | --- |
| eXeLearning H5P import | `importH5pAsElpx` |
| Web app (H5P + ADC) | `convert` with `templateBytes` |
| CLI | `convert` after reading files and optional `--template` |
| Direct project integration (future) | `convertToElpxProject` → Yjs |

## Package build

```bash
bun run --cwd packages/core build
# or: make core-build
```

Emits `packages/core/dist/**/*.js` + `.d.ts` with rewritten import extensions
for Node/bundler resolution outside this monorepo.
