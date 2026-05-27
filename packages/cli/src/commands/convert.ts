import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { basename, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import {
  convert,
  summarizeReport,
  type ConvertInput,
  type ConversionOptions
} from "@ateeducacion/h5p2elpx-core";

type CliOpts = {
  output: string;
  layout: ConversionOptions["layout"];
  unsupported: ConversionOptions["unsupported"];
  includeOriginalH5p?: boolean;
  title?: string;
  lang?: string;
  report?: string;
  template?: string;
  pretty?: boolean;
  strict?: boolean;
  theme?: string;
  /** commander's --no-search flips this to false (default true). */
  search?: boolean;
  mathjax?: boolean;
};

function findDefaultTemplate(): string | undefined {
  const here = dirname(fileURLToPath(import.meta.url));
  // packages/cli/src/commands → walk up to repo root → fixtures/elpx/template.elpx
  // The template is built from the official exelearning-static-vX.Y.Z.zip
  // bundle by scripts/build-template.ts.
  const candidates = [
    resolve(here, "../../../../fixtures/elpx/template.elpx"),
    resolve(here, "../../../fixtures/elpx/template.elpx"),
    resolve(process.cwd(), "fixtures/elpx/template.elpx")
  ];
  return candidates.find((p) => existsSync(p));
}

function toInput(filename: string, bytes: Uint8Array): ConvertInput {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".h5p")) {
    return { kind: "h5p-bytes", data: bytes, filename };
  }
  // .zip (and anything else) is sniffed at convert time so the user can
  // drop either an H5P, an ADC native, or an altia/SCORM/xAPI bundle.
  return { kind: "zip-bytes", data: bytes, filename };
}

async function gatherInputs(input: string): Promise<ConvertInput[]> {
  const s = await stat(input);
  if (s.isDirectory()) {
    const entries = await readdir(input);
    const candidates = entries.filter((e) => {
      const l = e.toLowerCase();
      return l.endsWith(".h5p") || l.endsWith(".zip");
    });
    return Promise.all(
      candidates.map(async (f) => toInput(f, new Uint8Array(await readFile(join(input, f)))))
    );
  }
  return [toInput(basename(input), new Uint8Array(await readFile(input)))];
}

export async function runConvert(input: string, opts: CliOpts): Promise<void> {
  const inputs = await gatherInputs(input);
  const templatePath = opts.template ?? findDefaultTemplate();
  const templateBytes = templatePath ? new Uint8Array(await readFile(templatePath)) : undefined;

  const result = await convert(inputs, {
    layout: opts.layout,
    unsupported: opts.unsupported,
    includeOriginalH5p: !!opts.includeOriginalH5p,
    title: opts.title,
    language: opts.lang,
    strict: !!opts.strict,
    pretty: !!opts.pretty,
    templateBytes,
    theme: opts.theme,
    enableSearch: opts.search !== false,
    enableMathJax: !!opts.mathjax
  });

  await writeFile(opts.output, result.elpx);
  result.report.output.file = opts.output;
  if (opts.report) {
    await writeFile(opts.report, JSON.stringify(result.report, null, 2));
  }
  console.log(summarizeReport(result.report));
  console.log(`\nWrote ${opts.output} (${result.elpx.byteLength} bytes)`);
}
