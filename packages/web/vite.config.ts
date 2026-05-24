import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@ateeducacion/h5p2elpx-core": resolve(__dirname, "../core/src/index.ts")
    }
  }
});
