# AGENTS.md — h5p2elpx

Context for AI coding agents working on this repo. Read this once at the
start of a session; the canonical truth is split across two upstream
projects (H5P and eXeLearning), and getting URLs/field names right
matters more than guessing.

## What this repo does

`h5p2elpx` converts H5P packages (`.h5p`) into editable eXeLearning
projects (`.elpx`). It is conservative: supported H5P content becomes a
real eXeLearning iDevice, anything we don't have a mapper for becomes a
visible warning iDevice with the source library name and reason.

Bun + TypeScript monorepo (`packages/core`, `packages/cli`,
`packages/web`). Core is isomorphic — no `node:*` imports — so the same
code runs in the CLI and in the browser SPA.

## Two upstream specs you must trust

### 1. eXeLearning v4 — output format

Source of truth lives **inside the upstream repo**, not on a website.
Clone it locally and read these files directly:

- `https://github.com/exelearning/exelearning` — clone alongside this
  repo (we keep an absolute reference at `/Users/ernesto/Downloads/git/exelearning`).
- `doc/elpx-format/` is the authoritative spec:
  - `content-xml.md` — root element, namespaces, section order, CDATA rules
  - `ids.md` — IDs are `YYYYMMDDHHmmss + 6 uppercase alphanumeric`
  - `assets.md` — three URL forms (`asset://` in Yjs, `{{context_path}}/<path>`
    in `content.xml`, relative in rendered HTML), flat `content/resources/`,
    no per-asset UUID subfolders
  - `pages-blocks.md` — page → block → component hierarchy + lockstep IDs
  - `validation.md` — what `OdeXmlValidator` checks
  - `idevices/patterns.md` — four storage patterns (Standard JSON,
    URI-encoded game data, embedded script, htmlView-only)
  - `idevices/catalog.md` — every modern typeName + which pattern it uses
  - `idevices/snippets.md` — paste-quality reference XML per iDevice
  - `examples/` — minimal / multi-page / full-package-tree
- Generator code: `src/shared/export/generators/OdeXmlGenerator.ts`
  (function `generateOdeXml(meta, pages)`).
- Importer code: `src/shared/import/ElpxImporter.ts` and the legacy
  handlers in `src/shared/import/legacy-handlers/` —
  **`TrueFalseHandler.ts`, `MultichoiceHandler.ts`, `FillHandler.ts`
  are the templates our writers mirror.** Field names there are
  authoritative: if our writer disagrees with a handler, change ours.
- Static runtime: the official `exelearning-static-vX.Y.Z.zip` asset
  on the GitHub releases page bundles `idevices.zip`, `libs.zip`,
  `common.zip`, `content-css.zip`, `themes/*.zip`.
  `scripts/build-template.ts` downloads and assembles
  `fixtures/elpx/template.elpx` from it; the writer clones that template
  on every conversion so themes/idevices/libs survive.

License: AGPL-3.0. Do not copy verbatim — **mirror schemas** with our
own code that produces the same on-disk output.

### 2. H5P — input format

Public spec and source:

- Format spec: https://h5p.org/documentation/developers/h5p-specification
- Content type catalog (human-readable index of every H5P content type
  and application — start here when scoping a new adapter):
  https://h5p.org/content-types-and-applications
- Library DB (per-content-type semantics + content shape):
  https://h5p.org/libraries
  Pick a library → `semantics.json` describes the `content.json` keys
  that library expects. Use this when an adapter is producing the wrong
  fields.
- Library source on GitHub: https://github.com/h5p (one repo per content
  type, e.g. `h5p/h5p-multi-choice`, `h5p/h5p-true-false`,
  `h5p/h5p-course-presentation`).

A `.h5p` is a ZIP with:
- `h5p.json` — title, mainLibrary, preloadedDependencies
- `content/content.json` — the activity-specific payload (the shape
  varies wildly per library — see semantics.json)
- `content/<assets>` — H5P groups assets under `images/`, `audios/`,
  `videos/`, `files/` as a storage convention; we flatten them on
  output because eXe reserves sub-folders for author choices.

## How the pieces fit together

```
.h5p ZIP
  → packages/core/src/h5p/read-h5p.ts          (JSZip; browser-safe)
  → packages/core/src/normalize/adapters/*     (one per H5P library; registry)
  → Normalized AST (packages/core/src/normalize/nodes.ts)
  → packages/core/src/convert/convert.ts       (layout planner + dispatch)
  → packages/core/src/exe/idevices/*           (one writer per typeName; registry)
  → packages/core/src/exe/content-xml.ts       (real ODE format)
  → packages/core/src/exe/elpx-writer.ts       (clone template + inject content.xml)
  → .elpx + JSON ConversionReport
```

Two registries are the only places that know about specific libraries:

- `packages/core/src/normalize/adapters/index.ts` — H5P machineName → adapter
- `packages/core/src/exe/idevices/index.ts` — eXe typeName → writer

Adding a new H5P type = one adapter file + one registry entry + one test.
Adding a new eXe iDevice = one writer file + plumbing in `convert.ts`'s
dispatch.

## Current H5P → eXe mapping

| H5P library | eXe typeName | Notes |
| --- | --- | --- |
| `H5P.Text`, `H5P.AdvancedText` | `text` | Standard JSON, exact eXe shape |
| `H5P.Image` | `text` (with `<figure><img>`) | dedicated `image-gallery` writer not implemented yet |
| `H5P.Audio` | `text` (with `<audio controls>`) | |
| `H5P.Video`, `H5P.InteractiveVideo` | `text` (with `<iframe>` for YouTube/Vimeo, `<video>` for direct files) | helper: `utils/embed.ts` |
| `H5P.Column` | flattens children to iDevices | |
| `H5P.CoursePresentation` | one eXe page per slide (in `preserve` layout) | |
| `H5P.InteractiveBook` | one eXe page per chapter | |
| `H5P.TrueFalse` | `trueorfalse` (game format with 35 i18n msgs) | mirror of `TrueFalseHandler` |
| `H5P.MultiChoice` | `form` with `activityType: "selection"` | mirror of `MultichoiceHandler`; `selectionType` is `single` when ≤1 correct, `multiple` otherwise |
| `H5P.SingleChoiceSet` | multiple `form` iDevices, one per choice | |
| `H5P.Summary` | multiple `form` iDevices (first option = correct) | |
| `H5P.Blanks` | `form` with `activityType: "fill"` | `*answer*` → `<u>answer</u>` via `blanksToFill()` helper |
| `H5P.DragText` | `form` with `activityType: "fill"` | same transform |
| `H5P.Dialogcards`, `H5P.MemoryGame` | `flipcards` (Pattern 2: URI-encoded JSON in hidden div) | |
| `H5P.Table` | `text` (HTML table) | |
| anything else | `text` fallback with "Unsupported H5P content" banner (unless `--unsupported drop`) | |

## H5P types not yet mapped — candidates

Triage of the unsupported entries on
https://h5p.org/content-types-and-applications against the eXe iDevice
catalog in
`/Users/ernesto/Downloads/git/exelearning/doc/elpx-format/idevices/catalog.md`.
Use this as a prioritized backlog — top rows are clean 1:1 fits, bottom
row stays on the `text` fallback because eXe has no native equivalent.

| H5P content type | machineName (likely) | Target eXe iDevice | Fit | Notes |
| --- | --- | --- | --- | --- |
| Image Juxtaposition | `H5P.ImageJuxtaposition` | `beforeafter` | excellent | Two images + slider — direct 1:1 |
| Iframe Embedder | `H5P.IFrameEmbed` | `external-website` | excellent | URL + width/height fields line up |
| Find the Words | `H5P.FindTheWords` | `word-search` | excellent | Grid + word list |
| Flashcards | `H5P.Flashcards` | `flipcards` | excellent | Reuse existing writer (Pattern 2) |
| Image Pairing | `H5P.ImagePair` | `flipcards` or `relate` | good | Reuse `flipcards` writer with image pairs |
| Image Sequencing | `H5P.ImageSequencing` | `sort` / `scrambled-list` | good | New writer needed |
| Sort the Paragraphs | `H5P.SortParagraphs` | `scrambled-list` | good | New writer needed |
| Image Slider | `H5P.ImageSlider` | `image-gallery` | good | New `image-gallery` writer (already on TODO) |
| Collage | `H5P.Collage` | `image-gallery` | good | Same writer as above |
| Quiz (Question Set) | `H5P.QuestionSet` | expand inline | good | Adapter only — emit one iDevice per child (mirror `InteractiveBook` strategy) |
| Accordion | `H5P.Accordion` | `text` (HTML `<details>`) | acceptable | Adapter only; no new writer |
| Questionnaire | `H5P.Questionnaire` | `form` (one per item) | acceptable | Adapter mirrors `Summary` pattern |
| Dictation | `H5P.Dictation` | `form` (`activityType: "fill"`) | acceptable | Lossy: drops audio prompts |
| Essay | `H5P.Essay` | `text` | acceptable | No free-text grading in eXe |
| Find the Hotspot | `H5P.ImageHotspotQuestion` | extend `multiple-hotspot-question` | acceptable | Small variant of the existing adapter |
| Chart, Timeline, Personality Quiz, Documentation Tool, KewAr Code, AR Scavenger, Audio Recorder, Speak the Words(+Set), Virtual Tour (360), Branching Scenario, Cornell Notes, Information Wall, Structure Strip, Advent Calendar, Impressive Presentation, Multimedia Choice, Complex Fill the Blanks, Arithmetic Quiz, Game Map, Guess the Answer | various | `text` fallback only | low | No reasonable native eXe equivalent; current fallback is correct |

Top 4 worth picking up first (best ROI — each maps 1:1 to an existing
eXe iDevice with little or no new writer code):

1. `H5P.ImageJuxtaposition` → `beforeafter`
2. `H5P.IFrameEmbedder` → `external-website`
3. `H5P.FindTheWords` → `word-search`
4. `H5P.Flashcards` → `flipcards` (reuses the writer used by
   `Dialogcards` / `MemoryGame`)

Sample `.h5p` files for these four are checked in at
`fixtures/h5p/image-juxtaposition.h5p`, `fixtures/h5p/iframe-embedder.h5p`,
`fixtures/h5p/find-the-words.h5p`, `fixtures/h5p/flashcards.h5p`
(downloaded from the official examples on h5p.org).

## Invariants (don't break these)

0. **Everything that lands in the repo or on GitHub is in English.**
   Code, identifiers, comments, log strings, docs, commit messages,
   branch names, PR titles and PR bodies — all English, always, even when
   the conversation with the user is in Spanish. Spanish stays in chat
   replies only.
1. **`packages/core` imports nothing from `node:*`.** It must run in the
   browser. CLI is the only place that touches `fs`.
2. **IDs are always `YYYYMMDDHHmmss + 6 uppercase alphanumeric`.**
   See `packages/core/src/exe/ids.ts`. Same format everywhere.
3. **`<htmlView>` and `<jsonProperties>` always CDATA-wrapped**
   (unconditional) via `wrapCdata()` from `packages/core/src/exe/cdata.ts`.
   `]]>` is split as `]]]]><![CDATA[>`.
4. **Asset URLs in `content.xml` use `{{context_path}}/<filename>`**, not
   relative paths or `asset://`. The importer
   (`ElpxImporter.convertContextPathToAssetRefs`) rewrites the token to
   `asset://<uuid>` on load. See `packages/core/src/h5p/asset-extractor.ts`.
5. **Asset paths are flat at `content/resources/<filename>`.** Drop
   H5P's `images/`, `audios/`, `videos/`, `files/` prefixes. Collisions
   suffixed (`photo.jpg`, `photo-2.jpg`).
6. **Lockstep IDs**: every block's `<odePageId>` matches its parent
   page; every component's `<odePageId>` + `<odeBlockId>` match their
   parents. The validator (`packages/core/src/exe/validate.ts`) enforces it.
7. **Unsupported content is never silently dropped** unless
   `--unsupported drop` is explicit. `--strict` aborts.

## Development workflow

```bash
make install        # bun install
make lint           # biome check . (read-only)
make fix            # biome check --write . (auto-fix lint + format)
make typecheck      # tsc --noEmit
make test           # vitest run (12 files, 46 tests)
make up             # Vite dev server
make template       # rebuild fixtures/elpx/template.elpx from exelearning release
make ci             # the gate CI runs (lint + typecheck + tests)
```

## Before pushing or opening a PR (mandatory)

CI runs `make ci` which is **lint + typecheck + tests**. Biome's lint step
fails on formatting drift, and tsc runs in strict mode. Always run this
sequence locally before `git push` / `gh pr create`:

```bash
make fix && make ci
```

- `make fix` auto-fixes Biome formatting/lint so the lint step in CI is clean.
- `make ci` catches strict-TS issues that `tsc` in isolation would also miss
  (e.g. `Object is possibly 'undefined'` on `array[0]` accesses in tests —
  use the `!` non-null assertion in tests where appropriate).
- If anything fails, fix and re-run before pushing. Do not push expecting CI
  to tell you what to fix.

## When you change a writer or adapter

1. **Read the corresponding upstream file first.** For writers, that's
   the matching legacy handler in eXe; for adapters, that's the
   library's `semantics.json` on https://h5p.org/libraries or the
   library's repo on https://github.com/h5p.
2. **Update or add a test** in `packages/core/tests/`. The existing
   shape-tests in `idevice-shapes.test.ts` are the model — pin the
   exact JSON / HTML structure you intend to produce.
3. **Verify with a real fixture.** The four real H5P samples in
   `fixtures/h5p/` cover most code paths. Convert one with
   `bun run packages/cli/src/index.ts convert <path> -o /tmp/out.elpx`
   and unzip the result to inspect `content.xml`.
4. **Manual eXeLearning import** is the only test that proves real-world
   correctness. Do this once per non-trivial change to a writer.

## Files you'll usually touch

- `packages/core/src/normalize/adapters/<library>.ts` — new H5P mapping
- `packages/core/src/exe/idevices/<typeName>.ts` — new eXe writer
- `packages/core/src/convert/convert.ts` — dispatch + asset URL plumbing
- `packages/core/src/exe/validate.ts` — new structural check
- `packages/core/tests/*.test.ts` — pin behaviour
- `fixtures/h5p/` — real H5P samples (don't add huge ones)
- `scripts/build-template.ts` — only when bumping the eXe release pin

## Files you usually don't touch

- `packages/core/src/exe/content-xml.ts` — section order is from the spec
- `packages/core/src/exe/elpx-writer.ts` — clone-template strategy is locked
- `packages/web/public/template.elpx` — regenerate via `make template`,
  don't hand-edit
