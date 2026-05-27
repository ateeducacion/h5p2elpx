#!/usr/bin/env bun
import { Command } from "commander";
import pkg from "../package.json";
import { runInspect } from "./commands/inspect.ts";
import { runConvert } from "./commands/convert.ts";
import { runValidate } from "./commands/validate.ts";

const program = new Command();
program
  .name("h5p2elpx")
  .description("Convert H5P packages into editable eXeLearning .elpx projects")
  .version(pkg.version);

program
  .command("inspect <input>")
  .description("Inspect an .h5p file and show detected H5P type and dependencies")
  .action(async (input: string) => {
    await runInspect(input);
  });

program
  .command("convert <input>")
  .description(
    "Convert an .h5p or ADC .zip (Aula Digital Canaria native / SCORM 1.2 / SCORM 2004 / xAPI / local) into an .elpx project"
  )
  .option("-o, --output <file>", "Output .elpx path", "output.elpx")
  .option("--layout <mode>", "Layout: blocks|pages|preserve", "preserve")
  .option("--unsupported <mode>", "Unsupported handling: keep|text|drop", "keep")
  .option("--include-original-h5p", "Embed the source .h5p inside the .elpx", false)
  .option("--title <title>", "Project title")
  .option("--lang <lang>", "Language code")
  .option("--report <file>", "Write JSON conversion report to <file>")
  .option("--template <file>", "Path to a minimal .elpx template")
  .option("--pretty", "Pretty-print XML output", false)
  .option("--strict", "Fail if unsupported content is present", false)
  .option("--theme <name>", "Output theme: base|nova|zen|neo|flux|universal", "base")
  .option("--no-search", "Don't generate search_index.js / search box")
  .option("--mathjax", "Inject MathJax v3 (CDN) into every page", false)
  .option(
    "--cover-style <mode>",
    "ADC cover rendering: rich (banner image + title overlay) or minimal",
    "rich"
  )
  .action(async (input: string, opts) => {
    await runConvert(input, opts);
  });

program
  .command("validate <input>")
  .description("Validate an .elpx project")
  .action(async (input: string) => {
    await runValidate(input);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error("h5p2elpx error:", err?.message ?? err);
  process.exit(1);
});
