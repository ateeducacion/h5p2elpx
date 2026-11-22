/**
 * Every adapter module can be the first one imported. Adapters that nest sub-content import adaptH5pSubContent from
 * the registry, which imports them back; the registry must not read their exports while that cycle is loading. Each
 * import runs in a fresh Bun process, because a test runner's shared module cache would hide the failure.
 */
import { execFile } from "node:child_process";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "bun:test";

const execFileAsync = promisify(execFile);
const ADAPTERS = resolve(__dirname, "../src/normalize/adapters");
const modules = readdirSync(ADAPTERS).filter((f) => f.endsWith(".ts") && f !== "index.ts");

describe("adapter modules", () => {
  it.each(modules)("%s imports on its own", async (file) => {
    const { stdout } = await execFileAsync("bun", [
      "-e",
      `const m = await import(${JSON.stringify(resolve(ADAPTERS, file))}); console.log(typeof m);`
    ]);
    expect(stdout.trim()).toBe("object");
  });
});
