# h5p2elpx

Convert H5P activities into editable eXeLearning `.elpx` projects.

`h5p2elpx` is a **conservative** converter: it maps supported H5P content into
editable eXeLearning iDevices and keeps unsupported content visible with clear
warnings instead of silently dropping it. Every conversion produces a JSON
report explaining what was converted, partially converted, or left as a
fallback.

> Status: MVP. CLI + browser-only web app + 20+ H5P adapters across the three
> phases described in the project spec.

## Installation

Requires [Bun](https://bun.sh) ≥ 1.1.

```bash
git clone <this repo>
cd h5p2elpx
bun install
```

The eXeLearning runtime template (`fixtures/elpx/template.elpx`) is already
committed. To rebuild it from a fresh
[eXeLearning release](https://github.com/exelearning/exelearning/releases)
(default: `v4.0.0`, theme `base`):

```bash
bun run build-template            # latest pinned default
bun run build-template v4.0.0 base
```

The script downloads `exelearning-static-vX.Y.Z.zip`, unpacks
`bundles/{idevices,libs,common,content-css}.zip` and
`bundles/themes/<theme>.zip`, and assembles them into the runtime parts of the
`.elpx` template (`idevices/`, `libs/`, `theme/`, `html/`, `content/css/`,
`index.html`, etc.). `h5p2elpx` always regenerates `content.xml` and
`content.dtd` during conversion. The GitHub Pages workflow runs this on every
push so the bundled web template stays up to date.

## CLI

```bash
# Inspect an .h5p package (detects main library, lists dependencies)
bun run packages/cli/src/index.ts inspect activity.h5p

# Convert
bun run packages/cli/src/index.ts convert activity.h5p \
  -o activity.elpx \
  --layout preserve \
  --include-original-h5p \
  --report report.json

# Convert a folder of .h5p files
bun run packages/cli/src/index.ts convert ./h5p-folder -o bundle.elpx

# Validate an .elpx
bun run packages/cli/src/index.ts validate activity.elpx
```

Options for `convert`:

| Option | Values | Default |
| --- | --- | --- |
| `--layout` | `blocks`, `pages`, `preserve` | `preserve` |
| `--unsupported` | `keep`, `text`, `drop` | `keep` |
| `--include-original-h5p` | flag | off |
| `--title <s>` | string | "Imported H5P content" |
| `--lang <code>` | string | unset |
| `--report <file>` | path | none |
| `--template <file>` | path to a real eXe `.elpx` template | none |
| `--strict` | flag | off (fails if anything is unsupported) |

## Web app

Drag-and-drop, fully client-side. No backend.

```bash
bun run --cwd packages/web dev          # local dev
bun run --cwd packages/web build        # production build → packages/web/dist
```

Deployed automatically to GitHub Pages on every push to `main` via
`.github/workflows/pages.yml`.

## Compatibility matrix

| Phase | H5P type | Mapping |
| --- | --- | --- |
| 1 | `H5P.Text`, `H5P.AdvancedText` | text iDevice |
| 1 | `H5P.Image` | text iDevice with `<img>` |
| 1 | `H5P.Audio` | text iDevice with `<audio>` |
| 1 | `H5P.Video` | text iDevice with `<video>` |
| 1 | `H5P.InteractiveVideo` | `interactive-video` iDevice (text + single-choice slides preserved) |
| 1 | `H5P.Column` | flattens children into iDevices |
| 1 | `H5P.CoursePresentation` | one eXe page per slide (preserve mode) |
| 1 | `H5P.InteractiveBook` | one eXe page per chapter |
| 1 | `H5P.Table` | HTML `<table>` in a text iDevice |
| 2 | `H5P.TrueFalse` | trueorfalse iDevice |
| 2 | `H5P.MultiChoice` | form iDevice (`activityType: "selection"`) |
| 2 | `H5P.SingleChoiceSet` | one form iDevice per choice |
| 2 | `H5P.Blanks` | form iDevice |
| 2 | `H5P.Dialogcards`, `H5P.MemoryGame` | flipcards iDevice |
| 2 | `H5P.Summary` | form iDevices |
| 3 | `H5P.DragText` | form iDevice |
| 3 | `H5P.MarkTheWords` | text fallback |
| 3 | `H5P.DragQuestion` | structured fallback (drag list + drop zones) |
| 3 | `H5P.ImageHotspots` | image + ordered hotspot list |
| 3 | `H5P.MultipleHotspotQuestion` | image + ordered hotspot list (geometry preserved as text) |
| 3 | `H5P.Crossword` | `crossword` iDevice (native eXe `$eXeCrucigrama`) |
| anything else | visible warning iDevice (unless `--unsupported drop`) |

## Architecture

```
.h5p ZIP
  → packages/core/src/h5p/read-h5p.ts          (JSZip, browser-safe)
  → packages/core/src/normalize/adapters/*     (registry — one file per H5P lib)
  → Normalized AST (packages/core/src/normalize/nodes.ts)
  → packages/core/src/convert/convert.ts       (layout planner: blocks|pages|preserve)
  → packages/core/src/exe/idevices/*           (registry — one writer per typeName)
  → packages/core/src/exe/elpx-writer.ts       (clones a template, injects content.xml)
  → .elpx ZIP + JSON ConversionReport
```

`packages/core` has zero Node-only imports — it works identically in the CLI
and in the browser.

## Adding a new H5P mapper

1. Create `packages/core/src/normalize/adapters/<your-type>.ts` exporting
   `machineName` and `adapt(content) → NormalizedNode`.
2. Add it to the registry in `adapters/index.ts`.
3. Add a unit test under `packages/core/tests/`.

## Adding a new eXeLearning iDevice writer

1. Create `packages/core/src/exe/idevices/<your-type>.ts` building an
   `ElpxIdevice` from a normalized node.
2. Wire it from `convert.ts` for the AST kinds it handles.

## Development

We use [Bun](https://bun.sh) and [Biome](https://biomejs.dev) — verbs are
the same as eXeLearning's:

```bash
make install        # bun install
make lint           # biome check . (read-only)
make fix            # biome check --write . (auto-fix lint + format)
make typecheck      # tsc --noEmit
make test           # vitest run
make test-watch     # vitest in watch mode
make up             # start the Vite dev server (web app)
make web-build      # build the production web bundle
make template       # rebuild fixtures/elpx/template.elpx from upstream
make ci             # the same gate CI runs
```

CI: `.github/workflows/test.yml` runs typecheck + tests on every push and PR.
`.github/workflows/pages.yml` builds and deploys the web app to GitHub Pages.

## Known limitations

* The generated `content.xml` targets the real eXeLearning ODE v2.0 format.
  `h5p2elpx` rewrites `content.xml`/`content.dtd` on every conversion while
  preserving the runtime assets from the bundled template (or a custom one
  passed via `--template`).
* H5P.InteractiveVideo preserves `H5P.Text` / `H5P.AdvancedText` overlays and
  `H5P.MultiChoice` / `H5P.SingleChoiceSet` questions as eXe interactive-video
  slides. Other interaction types (drag, hotspots, summaries, …) are dropped
  with a warning in the report.
* H5P.DragQuestion loses geometric positions (becomes a descriptive list).
* `H5P.ImageHotspots` and `H5P.MultipleHotspotQuestion` become an ordered
  list under the image, not an interactive overlay.

## License

AGPL-3.0-or-later (see `LICENSE`).
