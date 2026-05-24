import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@ateeducacion/h5p2elpx-core": resolve(__dirname, "packages/core/src/index.ts")
    }
  },
  test: {
    environment: "node",
    include: ["packages/*/tests/**/*.test.ts"],
    pool: "threads"
  }
});
