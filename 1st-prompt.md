# Project: h5p2elpx

I want to develop a tool called `h5p2elpx` to convert H5P packages (`.h5p`) into editable eXeLearning projects in `.elpx` format.

The goal is NOT to perfectly convert every possible H5P activity in the first version. The goal is to build a solid, extensible, safe architecture that:

1. Reads `.h5p` packages.
2. Inspects their internal structure.
3. Detects the main H5P content type.
4. Converts supported elements into eXeLearning iDevices.
5. Keeps unsupported elements as visible blocks with a clear warning.
6. Generates a valid `.elpx` file that can be imported into eXeLearning.
7. Provides both a CLI and a simple web version with drag & drop.
8. Generates a compatibility and conversion report.

The tool must be called `h5p2elpx`.

---

## Technical stack

Use:

- Bun as runtime and package manager.
- TypeScript.
- Vite for the web version.
- React or Preact for the web UI. Prefer React if it simplifies development.
- JSZip for reading and writing ZIP files.
- fast-xml-parser or a similar library for generating XML.
- commander, cac or clipanion for the CLI.
- zod for schema validation.
- vitest for tests.

Avoid Node-only APIs in the `core` package. The `core` package must work both in the CLI and in the browser.

---

## Monorepo structure

Create a monorepo with this approximate structure:

```text
h5p2elpx/
  package.json
  bun.lock
  tsconfig.json
  README.md
  LICENSE

  packages/
    core/
      package.json
      src/
        index.ts

        h5p/
          read-h5p.ts
          parse-h5p-json.ts
          parse-content-json.ts
          detect-library.ts
          asset-extractor.ts
          library-ref.ts
          h5p-types.ts

        normalize/
          normalize.ts
          nodes.ts
          adapters/
            index.ts
            text.ts
            image.ts
            audio.ts
            video.ts
            column.ts
            course-presentation.ts
            interactive-book.ts
            multichoice.ts
            truefalse.ts
            blanks.ts
            unsupported.ts

        exe/
          model.ts
          ids.ts
          cdata.ts
          content-xml.ts
          elpx-writer.ts
          template.ts
          resources.ts
          idevices/
            index.ts
            text.ts
            unsupported.ts
            trueorfalse.ts
            quick-questions.ts
            form.ts
            image-gallery.ts
            flipcards.ts
            dragdrop.ts

        convert/
          convert.ts
          conversion-options.ts
          conversion-plan.ts

        report/
          conversion-report.ts

        utils/
          slug.ts
          mime.ts
          path.ts
          html.ts

      tests/
        h5p-reader.test.ts
        cdata.test.ts
        convert-text.test.ts
        convert-course-presentation.test.ts
        unsupported.test.ts

    cli/
      package.json
      src/
        index.ts
        commands/
          inspect.ts
          convert.ts
          validate.ts

    web/
      package.json
      index.html
      vite.config.ts
      src/
        main.tsx
        App.tsx
        components/
          Dropzone.tsx
          ConversionOptions.tsx
          CompatibilityReport.tsx
          DownloadPanel.tsx
```

---

## Expected CLI commands

Implement these commands:

```bash
h5p2elpx inspect input.h5p
h5p2elpx convert input.h5p -o output.elpx
h5p2elpx convert ./input-folder -o output.elpx
h5p2elpx validate output.elpx
```

Options for `convert`:

```bash
--layout blocks|pages|preserve
--unsupported keep|text|drop
--include-original-h5p
--title "Project title"
--lang en
--report report.json
--pretty
--strict
```

Meaning:

* `--layout blocks`: put everything in a single eXeLearning page, with each converted H5P item as a block.
* `--layout pages`: create one eXeLearning page per H5P file.
* `--layout preserve`: preserve the internal structure when possible, for example converting Course Presentation slides or Interactive Book sections into pages or blocks.
* `--unsupported keep`: keep unsupported content as visible fallback iDevices.
* `--unsupported text`: convert unsupported content into a text warning only.
* `--unsupported drop`: omit unsupported content, but report it.
* `--include-original-h5p`: attach the original `.h5p` package inside the `.elpx` resources.
* `--strict`: fail the conversion if unsupported content is found.
* `--report`: write a JSON conversion report.

---

## H5P input handling

An `.h5p` file is a ZIP archive.

The reader must extract:

```text
h5p.json
content/content.json
content/*
H5P.* library folders
```

The tool must parse at least:

* `h5p.json`
* `content/content.json`
* asset files under `content/`
* library references from `preloadedDependencies`
* the `mainLibrary`

Create an internal type similar to:

```ts
export type H5PPackage = {
    title: string;
    language?: string;
    mainLibrary: H5PLibraryRef;
    dependencies: H5PLibraryRef[];
    contentJson: unknown;
    assets: H5PAsset[];
    rawFiles: Map<string, Uint8Array>;
};

export type H5PLibraryRef = {
    machineName: string;
    majorVersion?: number;
    minorVersion?: number;
    patchVersion?: number;
};

export type H5PAsset = {
    path: string;
    filename: string;
    mimeType?: string;
    data: Uint8Array;
};
```

Normalize library names so that:

```text
H5P.CoursePresentation 1.26 -> H5P.CoursePresentation
H5P.MultiChoice 1.16 -> H5P.MultiChoice
H5P.TrueFalse 1.8 -> H5P.TrueFalse
```

---

## Internal normalized AST

Do not convert H5P directly to eXeLearning XML.

First convert H5P into a normalized educational AST.

Example:

```ts
export type NormalizedNode =
    | NormalizedTextNode
    | NormalizedImageNode
    | NormalizedAudioNode
    | NormalizedVideoNode
    | NormalizedQuestionNode
    | NormalizedSlideDeckNode
    | NormalizedSlideNode
    | NormalizedPageNode
    | NormalizedContainerNode
    | NormalizedUnsupportedNode;

export type BaseNode = {
    id: string;
    sourceType: string;
    title?: string;
    metadata?: Record<string, unknown>;
};

export type NormalizedTextNode = BaseNode & {
    kind: "text";
    html: string;
};

export type NormalizedImageNode = BaseNode & {
    kind: "image";
    src: string;
    alt?: string;
    title?: string;
    caption?: string;
};

export type NormalizedAudioNode = BaseNode & {
    kind: "audio";
    src: string;
    title?: string;
};

export type NormalizedVideoNode = BaseNode & {
    kind: "video";
    src: string;
    title?: string;
    poster?: string;
};

export type NormalizedQuestionNode = BaseNode & {
    kind: "question";
    questionType: "truefalse" | "multichoice" | "blanks" | "unknown";
    prompt: string;
    answers?: NormalizedAnswer[];
    feedback?: string;
};

export type NormalizedAnswer = {
    text: string;
    correct?: boolean;
    feedback?: string;
};

export type NormalizedSlideDeckNode = BaseNode & {
    kind: "slide-deck";
    slides: NormalizedSlideNode[];
};

export type NormalizedSlideNode = BaseNode & {
    kind: "slide";
    children: NormalizedNode[];
};

export type NormalizedContainerNode = BaseNode & {
    kind: "container";
    children: NormalizedNode[];
};

export type NormalizedUnsupportedNode = BaseNode & {
    kind: "unsupported";
    reason: string;
    originalLibrary: string;
    originalData?: unknown;
};
```

---

## Initial H5P support matrix

Implement support incrementally.

### Phase 1: MVP

Support:

| H5P type                           | Output strategy                                              |
| ---------------------------------- | ------------------------------------------------------------ |
| `H5P.Text`                         | eXeLearning `text` iDevice                                   |
| Text fields inside other H5P types | eXeLearning `text` iDevice                                   |
| `H5P.Image`                        | `text` iDevice with `<img>` or image-related iDevice if easy |
| `H5P.Audio`                        | `text` iDevice with `<audio controls>`                       |
| `H5P.Video`                        | `text` iDevice with `<video controls>`                       |
| `H5P.CoursePresentation`           | slides converted into pages or blocks                        |
| `H5P.Column`                       | children converted into blocks/iDevices                      |
| Unknown/unsupported types          | fallback `text` iDevice with warning                         |

### Phase 2

Add:

| H5P type          | Output strategy                                                    |
| ----------------- | ------------------------------------------------------------------ |
| `H5P.TrueFalse`   | eXeLearning `trueorfalse` iDevice                                  |
| `H5P.MultiChoice` | eXeLearning `quick-questions` or multiple-choice iDevice           |
| `H5P.Blanks`      | eXeLearning `form`, `complete`, or fallback depending on structure |
| `H5P.Dialogcards` | `flipcards` or fallback                                            |
| `H5P.MemoryGame`  | `flipcards` or dedicated mapper                                    |

### Phase 3

Add complex interactive types:

| H5P type               | Output strategy                             |
| ---------------------- | ------------------------------------------- |
| `H5P.DragQuestion`     | eXeLearning `dragdrop`                      |
| `H5P.DragText`         | eXeLearning `dragdrop` or fallback          |
| `H5P.MarkTheWords`     | dedicated mapper or fallback                |
| `H5P.ImageHotspots`    | image + listed hotspots or fallback         |
| `H5P.InteractiveVideo` | eXeLearning `interactive-video` or fallback |
| `H5P.InteractiveBook`  | eXeLearning pages/sections                  |

---

## Unsupported content behavior

Unsupported content must never silently disappear unless the user explicitly uses:

```bash
--unsupported drop
```

Default behavior:

```bash
--unsupported keep
```

For unsupported content, generate a visible eXeLearning `text` iDevice containing:

```html
<div class="h5p2elpx-unsupported">
  <h2>Unsupported H5P content</h2>
  <p><strong>H5P type:</strong> H5P.ImageHotspots</p>
  <p>This H5P activity type is not supported by h5p2elpx yet. The original content has not been converted into an editable eXeLearning interaction.</p>
</div>
```

If `--include-original-h5p` is enabled, store the original `.h5p` package under something like:

```text
content/resources/original/activity-name.h5p
```

The report must include every unsupported item.

---

## eXeLearning output model

Build an internal model before writing XML:

```ts
export type ElpxProject = {
    id: string;
    title: string;
    language?: string;
    pages: ElpxPage[];
    resources: ElpxResource[];
};

export type ElpxPage = {
    id: string;
    parentId?: string;
    title: string;
    order: number;
    blocks: ElpxBlock[];
};

export type ElpxBlock = {
    id: string;
    pageId: string;
    order: number;
    iDevices: ElpxIdevice[];
};

export type ElpxIdevice = {
    id: string;
    pageId: string;
    blockId: string;
    typeName: string;
    title?: string;
    htmlView: string;
    jsonProperties: unknown;
    order: number;
    visibility?: boolean;
};

export type ElpxResource = {
    path: string;
    data: Uint8Array;
    mimeType?: string;
};
```

The writer must generate a valid `.elpx` ZIP.

At minimum, generate:

```text
content.xml
content.dtd
content/resources/*
```

Prefer using a minimal valid `.elpx` template exported from eXeLearning and replacing/injecting:

* `content.xml`
* `content/resources/*`
* required metadata
* generated iDevices

Do not attempt to synthesize every eXeLearning file from scratch unless necessary.

---

## eXeLearning layout behavior

Support three layout modes:

### `blocks`

All content goes into one eXeLearning page.

Example:

```text
Page: Imported H5P content
  Block 1: Activity 1
    iDevice 1
    iDevice 2
  Block 2: Activity 2
    iDevice 1
```

### `pages`

Each H5P file becomes one eXeLearning page.

Example:

```text
Page: Activity 1
  Block 1
    iDevices...

Page: Activity 2
  Block 1
    iDevices...
```

### `preserve`

Try to preserve H5P structure.

Examples:

* `H5P.CoursePresentation`: each slide becomes a page or block depending on configuration.
* `H5P.InteractiveBook`: each chapter/section becomes a page.
* `H5P.Column`: children become blocks/iDevices in the same page.
* Simple H5P activities become one page or one block.

---

## iDevice generation

Implement at least these iDevice writers:

### `text`

Input:

```ts
{
    html: string;
}
```

Output:

* `odeIdeviceTypeName`: `text`
* `htmlView`: HTML wrapped in a valid eXeLearning text iDevice structure.
* `jsonProperties`: must include the editable HTML content.

The generated HTML must preserve:

* headings
* paragraphs
* lists
* links
* images
* audio
* video
* simple tables where possible

Sanitize only dangerous content. Do not remove valid educational HTML unnecessarily.

### `unsupported`

This is implemented as a `text` iDevice with a warning box.

### `trueorfalse`

Convert simple true/false questions.

### `quick-questions` / multiple choice

Convert simple multiple-choice questions when the structure is unambiguous.

If the question structure cannot be represented safely, fallback to unsupported.

---

## CDATA handling

When generating `content.xml`, any field containing HTML or JSON must be safely wrapped in CDATA.

Implement a utility:

```ts
export function wrapCdata(value: string): string;
```

It must handle embedded `]]>` safely by splitting the CDATA:

```text
]]>
```

should become something safe like:

```text
]]]]><![CDATA[>
```

Add tests for this.

---

## Asset handling

Assets from H5P must be copied into the `.elpx` package under:

```text
content/resources/h5p2elpx/<activity-id>/
```

References inside generated HTML must be rewritten.

Example:

```html
<img src="images/photo.jpg">
```

becomes:

```html
<img src="resources/h5p2elpx/activity-id/images/photo.jpg">
```

or the correct relative path expected by eXeLearning.

Handle at least:

* images
* audio
* video
* poster images
* linked files if present

Avoid filename collisions by namespacing each H5P package.

---

## Conversion report

Generate a detailed JSON report:

```ts
export type ConversionReport = {
    tool: "h5p2elpx";
    version: string;
    input: {
        files: string[];
    };
    output: {
        file?: string;
        format: "elpx";
    };
    summary: {
        totalActivities: number;
        converted: number;
        partiallyConverted: number;
        unsupported: number;
        warnings: number;
        errors: number;
    };
    activities: ConversionActivityReport[];
};

export type ConversionActivityReport = {
    sourceFile: string;
    title?: string;
    mainLibrary: string;
    status: "converted" | "partial" | "unsupported" | "error";
    mappedTo?: string[];
    unsupportedItems: UnsupportedItemReport[];
    warnings: string[];
    errors: string[];
};

export type UnsupportedItemReport = {
    sourceType: string;
    path?: string;
    reason: string;
};
```

The CLI should print a readable summary and optionally write the full JSON report.

Example CLI output:

```text
h5p2elpx conversion report

Input: activity.h5p
Output: activity.elpx

Converted: 6
Partially converted: 2
Unsupported: 1
Warnings: 3

Unsupported content:
- H5P.ImageHotspots: no mapper implemented yet
```

---

## Web app

Create a simple Vite web app.

Features:

1. Drag & drop area for `.h5p` files.
2. File list.
3. Options:

   * layout: blocks/pages/preserve
   * unsupported handling: keep/text/drop
   * include original H5P: yes/no
   * project title
   * language
4. Compatibility preview using the same `inspect` logic from the core package.
5. Convert button.
6. Download `.elpx`.
7. Download JSON report.

The web app must run entirely client-side if possible.

Avoid server requirements for the first version.

---

## Validation

Implement a basic `validate` command:

```bash
h5p2elpx validate output.elpx
```

It should check:

* file is a ZIP
* `content.xml` exists
* `content.dtd` exists if expected
* required resource paths exist
* all referenced resources exist
* XML is well-formed
* project has at least one page
* each page has valid IDs
* each iDevice has:

  * ID
  * type name
  * page ID
  * block ID
  * order
  * htmlView
  * jsonProperties

Full eXeLearning semantic validation can be added later.

---

## Tests

Add tests for:

1. Reading `.h5p` ZIPs.
2. Parsing `h5p.json`.
3. Detecting `mainLibrary`.
4. Normalizing H5P library names.
5. Rewriting asset paths.
6. CDATA escaping.
7. Generating a minimal `.elpx`.
8. Converting text content.
9. Converting image content.
10. Converting Course Presentation into pages.
11. Unsupported fallback behavior.
12. Strict mode failure when unsupported content exists.

Use fixtures under:

```text
fixtures/
  h5p/
    text.h5p
    image.h5p
    course-presentation.h5p
    multichoice.h5p
  elpx/
    minimal-template.elpx
```

If real fixtures cannot be committed due to licensing, create small synthetic H5P-like ZIPs in tests.

---

## Documentation

Create a `README.md` with:

1. What the tool does.
2. What it does not do yet.
3. Installation.
4. CLI usage.
5. Web usage.
6. Compatibility matrix.
7. Development instructions.
8. Architecture overview.
9. How to add a new H5P mapper.
10. How to add a new eXeLearning iDevice writer.
11. Known limitations.

Example intro:

```markdown
# h5p2elpx

Convert H5P activities into editable eXeLearning `.elpx` projects.

`h5p2elpx` is a conservative converter: it converts supported H5P content into editable eXeLearning iDevices and keeps unsupported content visible with clear warnings instead of silently dropping it.
```

---

## Important design constraints

1. Never silently drop unsupported content.
2. Prefer partial conversion plus warnings over pretending full compatibility.
3. Keep the original H5P data available in reports.
4. Keep the architecture adapter-based.
5. Make it easy to add new H5P mappers.
6. Make it easy to add new eXeLearning iDevice writers.
7. Keep `core` independent from CLI and web.
8. Ensure the generated `.elpx` can be imported by eXeLearning.
9. Add tests for every new mapper.
10. Use TypeScript strictly.

---

## Coding style

* Use TypeScript.
* Use strict mode.
* Avoid `any` unless absolutely necessary.
* Use zod for validating external JSON structures.
* Prefer pure functions in `core`.
* Do not mix CLI-specific filesystem logic into `core`.
* Use English for code, comments, documentation, issues and pull requests.
* Keep functions small and testable.
* Add meaningful error messages.

---

## First implementation target

Build the MVP in this order:

1. Set up the monorepo.
2. Implement `.h5p` ZIP reading.
3. Parse `h5p.json`.
4. Parse `content/content.json`.
5. Implement `inspect`.
6. Implement normalized AST.
7. Implement `text`, `image`, `audio`, `video`, `column`, `course-presentation`, and `unsupported` adapters.
8. Implement a minimal eXeLearning project model.
9. Implement text iDevice writer.
10. Implement unsupported fallback writer.
11. Implement asset copying and path rewriting.
12. Implement `.elpx` writer using a minimal template.
13. Implement `convert`.
14. Implement JSON report.
15. Implement basic `validate`.
16. Implement Vite web drag & drop.
17. Add tests.
18. Write README.

Do not start with complex interactive H5P activities. Start with safe, visible, auditable conversion.

---

## Expected result

At the end of the MVP, I should be able to run:

```bash
h5p2elpx convert activity.h5p -o activity.elpx --layout preserve --include-original-h5p --report report.json
```

And get:

* a valid `activity.elpx`;
* converted text/media/slides where supported;
* unsupported content represented visibly as warning iDevices;
* all assets copied into the `.elpx`;
* a JSON report explaining exactly what was converted, partially converted or unsupported.

The implementation should be clean, extensible and prepared for future mappers.
