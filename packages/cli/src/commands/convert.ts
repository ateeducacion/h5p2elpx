import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { basename, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import {
  convert,
  summarizeReport,
  type ConvertInput,
  type ConversionOptions
} from "@h5p2elpx/core";

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
};

function findDefaultTemplate(): string | undefined {
  const here = dirname(fileURLToPath(import.meta.url));
  // packages/cli/src/commands → walk up to repo root → fixtures/elpx/sample.elpx
  const candidates = [
    resolve(here, "../../../../fixtures/elpx/sample.elpx"),
    resolve(here, "../../../fixtures/elpx/sample.elpx"),
    resolve(process.cwd(), "fixtures/elpx/sample.elpx")
  ];
  return candidates.find((p) => existsSync(p));
}

async function gatherInputs(input: string): Promise<ConvertInput[]> {
  const s = await stat(input);
  if (s.isDirectory()) {
    const entries = await readdir(input);
    const h5pFiles = entries.filter((e) => e.toLowerCase().endsWith(".h5p"));
    return Promise.all(
      h5pFiles.map(async (f) => ({
        kind: "h5p-bytes" as const,
        data: new Uint8Array(await readFile(join(input, f))),
        filename: f
      }))
    );
  }
  return [
    {
      kind: "h5p-bytes",
      data: new Uint8Array(await readFile(input)),
      filename: basename(input)
    }
  ];
}

export async function runConvert(input: string, opts: CliOpts): Promise<void> {
  const inputs = await gatherInputs(input);
  const templatePath = opts.template ?? findDefaultTemplate();
  const templateBytes = templatePath
    ? new Uint8Array(await readFile(templatePath))
    : undefined;

  const result = await convert(inputs, {
    layout: opts.layout,
    unsupported: opts.unsupported,
    includeOriginalH5p: !!opts.includeOriginalH5p,
    title: opts.title,
    language: opts.lang,
    strict: !!opts.strict,
    pretty: !!opts.pretty,
    templateBytes
  });

  await writeFile(opts.output, result.elpx);
  result.report.output.file = opts.output;
  if (opts.report) {
    await writeFile(opts.report, JSON.stringify(result.report, null, 2));
  }
  console.log(summarizeReport(result.report));
  console.log(`\nWrote ${opts.output} (${result.elpx.byteLength} bytes)`);
}
