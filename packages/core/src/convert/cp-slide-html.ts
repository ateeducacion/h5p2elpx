import type { CpSlide } from "../normalize/nodes.ts";
import { sanitizeHtml, rewriteUrls, escapeHtml } from "../utils/html.ts";

/**
 * Render a normalized Course Presentation slide as a single HTML blob
 * suitable for the eXeLearning `text` iDevice. eXe has no slide-overlay
 * iDevice, so we reproduce H5P's percent-based layout with absolute
 * positioning inside a 16:9 container (the H5P default aspect ratio).
 *
 * Asset paths are rewritten through `forHtml` so they end up as
 * `{{context_path}}/<filename>` (per the AGENTS.md invariant), which the
 * eXe importer later resolves to `asset://<uuid>`.
 */
export function buildCpSlideHtml(slide: CpSlide, forHtml: (src: string) => string): string {
  const sorted = [...slide.elements].sort((a, b) => a.order - b.order);
  const parts: string[] = [];
  parts.push(
    `<div class="cp-slide" style="position:relative;width:100%;padding-top:56.25%;background:#fff;border:1px solid #ddd;overflow:hidden;">`
  );
  parts.push(`<div style="position:absolute;left:0;top:0;right:0;bottom:0;">`);
  for (const el of sorted) {
    const style =
      `position:absolute;` +
      `left:${pct(el.x)};top:${pct(el.y)};` +
      `width:${pct(el.w)};height:${pct(el.h)};` +
      `overflow:hidden;`;
    if (el.payload.kind === "image") {
      const src = forHtml(el.payload.src);
      const alt = el.payload.alt ?? "";
      parts.push(
        `<div style="${style}">` +
          `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" ` +
          `style="display:block;width:100%;height:100%;object-fit:contain;" />` +
          `</div>`
      );
      continue;
    }
    if (el.payload.kind === "html") {
      const inner = rewriteUrls(sanitizeHtml(el.payload.html), forHtml);
      parts.push(`<div style="${style}">${inner}</div>`);
      continue;
    }
    if (el.payload.kind === "goto") {
      const title = `Go to slide ${el.payload.goToSlide}`;
      parts.push(
        `<div style="${style}border:1px dashed #888;background:rgba(0,0,0,0.02);" ` +
          `title="${escapeHtml(title)}"></div>`
      );
      continue;
    }
    // unsupported
    parts.push(
      `<div style="${style}border:1px solid #c00;background:rgba(255,0,0,0.05);" ` +
        `title="${escapeHtml(`Unsupported in slide: ${el.payload.library}`)}">` +
        `<small style="color:#c00;">${escapeHtml(el.payload.library)}</small>` +
        `</div>`
    );
  }
  parts.push(`</div>`);
  parts.push(`</div>`);
  return parts.join("");
}

function pct(v: number): string {
  // Clamp to a sane range; H5P sometimes emits slightly-over-100 values.
  const clamped = Math.max(-50, Math.min(150, v));
  return `${Math.round(clamped * 1000) / 1000}%`;
}
