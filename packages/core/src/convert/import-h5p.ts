import type { ElpxProject } from "../exe/model.ts";
import { writeElpx } from "../exe/elpx-writer.ts";
import type { ConversionReport } from "../report/conversion-report.ts";
import { convertToElpxProject, type ConvertInput, type ConvertToProjectResult } from "./convert.ts";
import type { LayoutMode, UnsupportedMode } from "./conversion-options.ts";

/**
 * Defaults applied by {@link importH5pAsElpx} for eXeLearning-oriented
 * browser imports. These intentionally differ from
 * {@link DEFAULT_OPTIONS} used by the CLI/web (`includeOriginalH5p` is
 * on by default here; search is off).
 */
export const H5P_IMPORT_DEFAULTS = {
  layout: "preserve" as const satisfies LayoutMode,
  unsupported: "keep" as const satisfies UnsupportedMode,
  includeOriginalH5p: true,
  strict: false,
  enableSearch: false,
  enableMathJax: false
};

/** Public error codes for the high-level H5P import API. */
export type H5pImportErrorCode =
  | "INVALID_H5P"
  | "INVALID_OPTIONS"
  | "TEMPLATE_REQUIRED"
  | "INVALID_TEMPLATE"
  | "UNSUPPORTED_CONTENT"
  | "ELPX_WRITE_FAILED"
  | "CONVERSION_FAILED";

/**
 * Structured error thrown by {@link importH5pAsElpx}.
 * Safe to surface to end users: messages avoid leaking low-level ZIP details.
 */
export class H5pImportError extends Error {
  readonly code: H5pImportErrorCode;
  readonly filename?: string;
  readonly report?: ConversionReport;
  override readonly cause?: unknown;

  constructor(
    code: H5pImportErrorCode,
    message: string,
    options?: {
      filename?: string;
      report?: ConversionReport;
      cause?: unknown;
    }
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "H5pImportError";
    this.code = code;
    if (options?.filename !== undefined) this.filename = options.filename;
    if (options?.report !== undefined) this.report = options.report;
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}

/**
 * Options for {@link importH5pAsElpx}.
 *
 * `templateElpx` is **required**: a complete eXeLearning runtime template
 * must be supplied by the host (matching its eXe version) so the generated
 * `.elpx` opens cleanly. The lower-level {@link convert} API still allows
 * an optional template for bare-ZIP fallbacks.
 */
export type H5pImportOptions = {
  /** Source filename used in reports and original-H5P embedding (e.g. `activity.h5p`). */
  filename: string;
  title?: string;
  language?: string;
  layout?: LayoutMode;
  unsupported?: UnsupportedMode;
  includeOriginalH5p?: boolean;
  strict?: boolean;
  enableSearch?: boolean;
  enableMathJax?: boolean;
  theme?: string;
  /**
   * Bytes of an eXeLearning `.elpx` template (theme, libs, idevices, …).
   * Required for a fully importable package.
   */
  templateElpx: Uint8Array | ArrayBuffer;
};

/** Result of a successful {@link importH5pAsElpx} call. */
export type H5pImportResult = {
  /** Complete `.elpx` package as bytes (no filesystem involved). */
  elpx: Uint8Array;
  /** Intermediate project model (pages, blocks, iDevices, resources). */
  project: ElpxProject;
  /** Machine-readable conversion report (including partial/unsupported items). */
  report: ConversionReport;
};

/**
 * Convert a single H5P package in memory into an eXeLearning `.elpx`.
 *
 * Designed for browser hosts (eXeLearning File → Import): accepts file
 * bytes, never touches the filesystem, and requires the host to supply
 * template bytes matching its runtime.
 *
 * @example
 * ```ts
 * const buf = await file.arrayBuffer();
 * const template = await fetch("/templates/template.elpx").then((r) => r.arrayBuffer());
 * const { elpx, report } = await importH5pAsElpx(buf, {
 *   filename: file.name,
 *   templateElpx: template,
 * });
 * ```
 */
export async function importH5pAsElpx(
  data: Uint8Array | ArrayBuffer,
  options: H5pImportOptions
): Promise<H5pImportResult> {
  const filename = options.filename?.trim();
  if (!filename) {
    throw new H5pImportError(
      "INVALID_OPTIONS",
      "A non-empty filename is required (for example activity.h5p)."
    );
  }

  if (options.templateElpx == null) {
    throw new H5pImportError(
      "TEMPLATE_REQUIRED",
      "templateElpx is required. Pass the bytes of an eXeLearning .elpx template that matches the host runtime.",
      { filename }
    );
  }

  const h5pBytes = toUint8Array(data);
  const templateBytes = toUint8Array(options.templateElpx);

  if (templateBytes.byteLength === 0) {
    throw new H5pImportError(
      "TEMPLATE_REQUIRED",
      "templateElpx is empty. Pass a complete eXeLearning .elpx template.",
      { filename }
    );
  }

  if (h5pBytes.byteLength === 0) {
    throw new H5pImportError("INVALID_H5P", `H5P package is empty: ${filename}`, {
      filename
    });
  }

  const inputs: ConvertInput[] = [{ kind: "h5p-bytes", data: h5pBytes, filename }];

  let conversion: ConvertToProjectResult;
  try {
    conversion = await convertToElpxProject(inputs, {
      layout: options.layout ?? H5P_IMPORT_DEFAULTS.layout,
      unsupported: options.unsupported ?? H5P_IMPORT_DEFAULTS.unsupported,
      includeOriginalH5p: options.includeOriginalH5p ?? H5P_IMPORT_DEFAULTS.includeOriginalH5p,
      strict: options.strict ?? H5P_IMPORT_DEFAULTS.strict,
      enableSearch: options.enableSearch ?? H5P_IMPORT_DEFAULTS.enableSearch,
      enableMathJax: options.enableMathJax ?? H5P_IMPORT_DEFAULTS.enableMathJax,
      title: options.title,
      language: options.language,
      theme: options.theme,
      templateBytes
    });
  } catch (err) {
    throw mapConversionError(err, filename);
  }

  let elpx: Uint8Array;
  try {
    elpx = await writeElpx(conversion.project, {
      templateBytes,
      originalH5pPackages: conversion.originalH5pPackages,
      theme: conversion.options.theme,
      enableSearch: conversion.options.enableSearch,
      enableMathJax: conversion.options.enableMathJax
    });
  } catch (err) {
    throw new H5pImportError(
      isLikelyTemplateError(err) ? "INVALID_TEMPLATE" : "ELPX_WRITE_FAILED",
      isLikelyTemplateError(err)
        ? `Invalid eXeLearning template for ${filename}. Provide a valid .elpx template matching the host runtime.`
        : `Failed to write .elpx for ${filename}.`,
      { filename, report: conversion.report, cause: err }
    );
  }

  return {
    elpx,
    project: conversion.project,
    report: conversion.report
  };
}

function toUint8Array(data: Uint8Array | ArrayBuffer): Uint8Array {
  return data instanceof Uint8Array ? data : new Uint8Array(data);
}

function mapConversionError(err: unknown, filename: string): H5pImportError {
  if (err instanceof H5pImportError) return err;

  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (/strict mode/i.test(message)) {
    return new H5pImportError(
      "UNSUPPORTED_CONTENT",
      `Conversion of ${filename} failed in strict mode because unsupported content was found.`,
      { filename, cause: err }
    );
  }

  if (
    /missing h5p\.json/i.test(message) ||
    /missing content\/content\.json/i.test(message) ||
    /invalid h5p/i.test(message) ||
    /h5p package/i.test(message)
  ) {
    return new H5pImportError(
      "INVALID_H5P",
      `Invalid H5P package: ${filename}. ${sanitizeMessage(message)}`,
      { filename, cause: err }
    );
  }

  // JSZip / corrupt archive messages
  if (
    /corrupted zip|end of central directory|can't find end of central directory|invalid zip|not a zip/i.test(
      lower
    ) ||
    /zip/i.test(lower)
  ) {
    return new H5pImportError(
      "INVALID_H5P",
      `Invalid or corrupted H5P package: ${filename}. The file is not a readable ZIP archive.`,
      { filename, cause: err }
    );
  }

  if (/json/i.test(lower) && /(parse|unexpected|syntax)/i.test(lower)) {
    return new H5pImportError(
      "INVALID_H5P",
      `Invalid H5P package: ${filename}. Package metadata or content JSON could not be parsed.`,
      { filename, cause: err }
    );
  }

  return new H5pImportError(
    "CONVERSION_FAILED",
    `Conversion failed for ${filename}. ${sanitizeMessage(message)}`,
    { filename, cause: err }
  );
}

function isLikelyTemplateError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();
  return /corrupted zip|end of central directory|can't find end of central directory|invalid zip|not a zip/i.test(
    lower
  );
}

/** Strip noisy implementation detail while keeping a usable phrase. */
function sanitizeMessage(message: string): string {
  return message.replace(/\s+/g, " ").replace(/JSZip/gi, "ZIP").trim().slice(0, 280);
}
