export const en = {
  topbar: { language: "Language" },
  hero: {
    badge: "Browser tool · 100% client-side",
    titleBefore: "Convert ",
    titleMiddle: " to editable ",
    titleAfter: "",
    ledeBefore: "Drop a ",
    ledeMiddle: " package and download an ",
    ledeAfter: " project you can open and edit in eXeLearning. Nothing leaves your browser."
  },
  stepper: {
    upload: "Upload .h5p",
    review: "Review compatibility",
    configure: "Configure options",
    download: "Download .elpx"
  },
  boxes: {
    upload: "1 · Upload H5P packages",
    preview: "2 · Compatibility preview",
    options: "3 · Conversion options"
  },
  meta: {
    filesReadyOne: "{count} file ready",
    filesReadyMany: "{count} files ready",
    allOk: "All files supported",
    someAttention: "Some content needs attention"
  },
  compat: {
    ok: "Supported",
    partial: "Partial",
    no: "Unsupported"
  },
  dropzone: {
    dropBefore: "Drag & drop your ",
    dropAfter: " files here",
    or: "or",
    browse: "browse from your computer",
    hint: "Multiple files supported · Processed locally",
    remove: "Remove {name}"
  },
  options: {
    layout: "Layout",
    layoutPreserve: "Preserve — keep H5P structure",
    layoutBlocks: "Blocks — one page, one block per chunk",
    layoutPages: "Pages — one page per file",
    layoutHint: "How H5P containers map to eXeLearning pages.",
    unsupported: "Unsupported content",
    unsupportedKeep: "Keep — insert a warning iDevice",
    unsupportedText: "Convert to plain text",
    unsupportedDrop: "Drop silently",
    unsupportedHint: "What to do when an H5P type has no mapping.",
    title: "Project title",
    titlePlaceholder: "Imported H5P content",
    titleHint: "Shown as the package title in eXeLearning.",
    language: "Language",
    languagePlaceholder: "en, es, fr, ca…",
    languageHintBefore: "ISO 639-1 code used in ",
    languageHintAfter: ".",
    theme: "Theme",
    themeHint: "eXeLearning visual theme applied to the exported pages.",
    extras: "Page extras",
    enableSearch: "Generate search index",
    enableSearchHintBefore: "Ships ",
    enableSearchHintAfter: " so eXe's site search works.",
    enableMathJax: "Enable MathJax",
    enableMathJaxHint: "Renders LaTeX via the MathJax v3 CDN.",
    includeOriginal: "Include the original .h5p inside the .elpx",
    includeOriginalHint: "Useful as a backup — the source package travels with the project."
  },
  convertBar: {
    readyBefore: "Ready to convert ",
    readyMiddleOne: " file as ",
    readyMiddleMany: " files as ",
    readyEmbedded: ", with original .h5p embedded",
    readyEnd: ".",
    converting: "Converting…",
    convert: "Convert to .elpx"
  },
  download: {
    complete: "Conversion complete",
    summaryAfter: " — your .elpx is ready.",
    converted: "{n} converted",
    partial: "{n} partial",
    unsupported: "{n} unsupported",
    downloadBtn: "Download {filename}",
    reportBtn: "report.json",
    statConverted: "Converted",
    statPartial: "Partial",
    statUnsupported: "Unsupported",
    statWarnings: "Warnings",
    statErrors: "Errors"
  },
  footer: {
    madeWithBefore: "Made with ",
    madeWithMiddle: " by ",
    licenseLink: "AGPL-3.0",
    sourceCode: "Source Code"
  },
  errors: {
    templateNotFound: "Could not load eXe template: {msg}"
  },
  github: {
    cornerAria: "View source on GitHub"
  },
  experimental: {
    warning:
      "Notice: this feature is in experimental phase. Generated files may contain errors, so reviewing them before use is recommended.",
    dismiss: "Dismiss warning"
  },
  cli: {
    title: "Use from terminal (CLI)",
    installInfo:
      "Install Bun, clone the repository, and run the local CLI from the project folder.",
    commandLabel: "Copy this example and replace file.h5p with your H5P package:",
    copy: "Copy",
    copied: "Copied!",
    issuesLabel: "Having issues?",
    issuesLink: "Report a broken H5P file",
    issueTemplateLabel:
      "When a file does not convert correctly, open an issue and include the file or a public URL with this short template:"
  }
};

export type Messages = typeof en;
