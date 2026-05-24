#!/usr/bin/env bun
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(HERE, "server-root");
const PORT = Number(process.env.PORT ?? 4173);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
  ".wasm": "application/wasm",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".zip": "application/zip",
  ".elpx": "application/zip"
};

function mimeFor(path: string) {
  return MIME[extname(path).toLowerCase()] ?? "application/octet-stream";
}

async function tryServe(path: string): Promise<Response | null> {
  try {
    const s = await stat(path);
    if (s.isDirectory()) return null;
    const file = Bun.file(path);
    return new Response(file, {
      headers: {
        "content-type": mimeFor(path),
        "cache-control": "no-cache",
        // Cross-origin isolation isn't required, but the harness and editor
        // share the same origin so postMessage just works.
        "x-served-by": "h5p2elpx-e2e"
      }
    });
  } catch {
    return null;
  }
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const decoded = decodeURIComponent(url.pathname);
    const safe = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
    const target = join(ROOT, safe);
    if (!target.startsWith(ROOT)) {
      return new Response("Forbidden", { status: 403 });
    }
    const direct = await tryServe(target);
    if (direct) return direct;
    if (safe === "/" || safe.endsWith("/")) {
      const index = await tryServe(join(target, "index.html"));
      if (index) return index;
    }
    return new Response("Not Found", { status: 404 });
  }
});

console.log(`e2e static server on http://localhost:${server.port} (root: ${ROOT})`);
