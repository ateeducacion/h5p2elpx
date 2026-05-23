import { readFile } from "node:fs/promises";
import { validateElpx } from "@h5p2elpx/core";

export async function runValidate(input: string): Promise<void> {
  const bytes = new Uint8Array(await readFile(input));
  const result = await validateElpx(bytes);
  console.log(`Validation: ${result.ok ? "OK" : "FAILED"}`);
  console.log(`Pages: ${result.stats.pages} | iDevices: ${result.stats.iDevices} | resources: ${result.stats.resources}`);
  for (const issue of result.issues) {
    console.log(`  [${issue.level}] ${issue.message}`);
  }
  if (!result.ok) process.exitCode = 1;
}
