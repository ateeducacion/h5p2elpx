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
| `H5P.Dialogcards`, `H5P.MemoryGame`, `H5P.Flashcards`, `H5P.ImagePair` | `flipcards` (Pattern 2: URI-encoded JSON in hidden div) | |
| `H5P.Table` | `text` (HTML table) | |
| `H5P.Crossword` | `crossword` iDevice (encrypted DataGame: XOR(146) + escape() — `exe/encrypt.ts`); `typeGame: "Crucigrama"`, `version: 2`, full `msgs` bag from `crossword-i18n.ts`. Answers are uppercased + whitespace-stripped + 14-char-truncated (eXe's solver requires this). Words are fed **longest-first** because eXe auto-positions them and uses the first `ceil(N/2)` as vertical anchors — longer anchors give the horizontal pass more crossings. The runtime ignores any per-word `x`/`y` we set, so exact H5P-layout fidelity is not possible | |
| `H5P.ImageJuxtaposition` | `beforeafter` (htmlView-only) | |
| `H5P.IFrameEmbed` | `external-website` (htmlView-only) | |
| `H5P.FindTheWords` | `word-search` (encrypted DataGame, `typeGame: "Sopa"`) | |
| `H5P.Accordion` | `text` with `<details><summary>` panels | |
| `H5P.Essay` | `text` with `<textarea>` placeholder | |
| `H5P.QuestionSet`, `H5P.Questionnaire` | flatten children into iDevices (Column-style) | |
| `H5P.Dictation` | `form` (fill); drops audio prompts | |
| `H5P.SortParagraphs`, `H5P.ImageSequencing` | ordered `text` (author re-scrambles in eXe) | |
| `H5P.ImageSlider`, `H5P.Collage` | `text` with sequential figures | |
| `H5P.ImageHotspots`, `H5P.MultipleHotspotQuestion`, `H5P.ImageHotspotQuestion` | `map` iDevice — markers pinned on the background image; text hotspots use `type: 2`, popup HTML is stored in sibling `mapa-LinkTextsPoints` divs, coordinates are normalized to 0..1, and `selectsGame` must still be an array with eXe's default question shape even for non-quiz maps. Data inside `mapa-DataGame` is **plain JSON** (no encryption, no URI-encoding). Runtime-sensitive scalar types matter: `order` must be `""`, not `0`, because `map/export/map.js` calls `.trim()` before rendering `mapaMainContainer-*`. See `exe/idevices/map.ts` | |
| `H5P.GuessTheAnswer`, `H5P.AdventCalendar`, `H5P.InformationWall` | `flipcards` — image+question (or panel/door content) on the front, solution/extra info on the back | |
| `H5P.MultiMediaChoice` | `form` (`activityType: "selection"`) — image options rendered as `<img>` inside the answer label; selectionType picked the same way as `H5P.MultiChoice` | |
| `H5P.ArithmeticQuiz` | container expanded into N `form` (selection) iDevices — H5P generates problems at runtime, so we synthesise a deterministic set (default 10) so the author can edit them in eXe | |
| `H5P.AdvancedBlanks` (Complex Fill the Blanks) | `form` (`activityType: "fill"`) — `[answer\|alt]` bracket syntax is rewritten into the `*answer*` markers consumed by `blanksToFill()` | |
| `H5P.Agamotto` | `beforeafter` when there are exactly two frames; sequential `<figure>` `text` iDevice otherwise — H5P's continuous slider has no eXe analogue | |
| `H5P.GameMap` | `map` iDevice — background image + markers parsed from each stage's `telemetry` string (`"x,y,w,h"` in percent); embedded text/image sub-content goes in the popup `eText` | |
| anything else | `text` fallback with "Unsupported H5P content" banner (unless `--unsupported drop`) | |

## H5P types still on the text fallback

The remaining content types from
https://h5p.org/content-types-and-applications stay on the generic
`text` fallback because eXeLearning has no native equivalent:

Chart, Timeline, Personality Quiz, Documentation Tool, KewAr Code,
AR Scavenger, Audio Recorder, Speak the Words(+Set), Virtual Tour
(360), Branching Scenario, Cornell Notes, Structure Strip, Impressive
Presentation.

Real H5P samples for every implemented mapping are checked into
`fixtures/h5p/` and exercised end-to-end by
`packages/core/tests/fixtures.test.ts`.

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
8. **Writer output must satisfy both eXe editor import and exported/runtime
   rendering.** Some iDevices accept malformed-ish data in edition mode but
   fail before rendering the visible HTML. Validate against the matching
   `public/files/perm/idevices/base/<type>/export/*.js` as well as the
   edition handler. Preserve upstream scalar types exactly: empty strings,
   arrays, booleans, and numbers are not interchangeable when runtime code
   does direct calls like `.trim()`, `.length`, or `Object.values()`.

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
   correctness. Do this once per non-trivial change to a writer. Check both
   the initial rendered view and the edit-save path. If the view is blank
   until edit/save, inspect the browser console and the iDevice export
   runtime; the editor may be reserializing fields into the types that the
   runtime expected all along.

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
