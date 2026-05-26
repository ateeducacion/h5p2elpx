import type { CpSlide, NormalizedNode, NormalizedQuestionNode } from "../normalize/nodes.ts";
import { blanksToFill } from "../exe/idevices/form.ts";
import { sanitizeHtml, rewriteUrls, escapeHtml } from "../utils/html.ts";
import { buildVideoEmbed } from "../utils/embed.ts";

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
    if (el.payload.kind === "node") {
      const inner = renderEmbeddedNode(el.payload.node, forHtml);
      parts.push(
        `<div style="${style}padding:0.5rem;box-sizing:border-box;overflow:auto;` +
          `background:rgba(255,255,255,0.94);border:1px solid #d8dee5;border-radius:0.25rem;` +
          `font-family:system-ui,sans-serif;line-height:1.35;">${inner}</div>`
      );
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

function renderEmbeddedNode(node: NormalizedNode, forHtml: (src: string) => string): string {
  switch (node.kind) {
    case "text":
      return renderRichHtml(node.html, forHtml);
    case "image": {
      const src = forHtml(node.src);
      const caption = node.caption ? `<figcaption>${escapeHtml(node.caption)}</figcaption>` : "";
      return (
        `<figure style="margin:0;">` +
        `<img src="${escapeHtml(src)}" alt="${escapeHtml(node.alt ?? "")}" ` +
        `style="display:block;max-width:100%;max-height:100%;object-fit:contain;margin:0 auto;" />` +
        `${caption}</figure>`
      );
    }
    case "audio":
      return `<audio controls src="${escapeHtml(forHtml(node.src))}" style="width:100%;"></audio>`;
    case "video": {
      const html = buildVideoEmbed(forHtml(node.src), {
        poster: node.poster ? forHtml(node.poster) : undefined,
        width: 960,
        height: 540
      });
      return stretchMediaHtml(html);
    }
    case "question":
      return renderQuestionSnapshot(node, forHtml);
    case "container":
      return node.children
        .map((child) => renderEmbeddedNode(child, forHtml))
        .filter(Boolean)
        .map(
          (child) =>
            `<div style="margin:0 0 0.6rem 0;padding-bottom:0.6rem;border-bottom:1px solid #edf1f5;">${child}</div>`
        )
        .join("");
    case "unsupported":
      return renderUnsupported(node.originalLibrary || node.sourceType);
    default:
      return renderUnsupported(node.sourceType);
  }
}

function renderQuestionSnapshot(
  node: NormalizedQuestionNode,
  forHtml: (src: string) => string
): string {
  const media = node.media?.src
    ? `<figure style="margin:0 0 0.5rem 0;"><img src="${escapeHtml(forHtml(node.media.src))}" alt="${escapeHtml(
        node.media.alt ?? ""
      )}" style="display:block;max-width:100%;max-height:12rem;object-fit:contain;margin:0 auto;" /></figure>`
    : "";
  const prompt = node.prompt
    ? `<div style="margin:0 0 0.5rem 0;">${renderRichHtml(node.prompt, forHtml)}</div>`
    : "";

  if (node.questionType === "multichoice") {
    const selectionType =
      node.selectionType ??
      ((node.answers ?? []).filter((a) => a.correct).length > 1 ? "multiple" : "single");
    const inputType = selectionType === "multiple" ? "checkbox" : "radio";
    const answers = (node.answers ?? [])
      .map(
        (answer) =>
          `<li style="list-style:none;margin:0 0 0.35rem 0;padding:0;">` +
          `<label style="display:flex;gap:0.45rem;align-items:flex-start;">` +
          `<input type="${inputType}" disabled />` +
          `<span>${renderRichHtml(answer.text, forHtml)}</span>` +
          `</label></li>`
      )
      .join("");
    return `${media}${prompt}<ul style="margin:0;padding:0;">${answers}</ul>`;
  }

  if (node.questionType === "blanks") {
    const fills = (node.answers ?? []).map((answer) => blanksToFill(answer.text));
    const questions = (fills.length > 0 ? fills : [blanksToFill(node.prompt)])
      .map(
        (fill) =>
          `<div style="margin:0 0 0.45rem 0;">${renderRichHtml(fill.baseText, forHtml)}</div>`
      )
      .join("");
    return `${media}${prompt}${questions}`;
  }

  if (node.questionType === "truefalse") {
    return (
      `${media}${prompt}` +
      `<ul style="margin:0;padding:0;">` +
      `<li style="list-style:none;margin:0 0 0.35rem 0;"><label style="display:flex;gap:0.45rem;"><input type="radio" disabled /><span>True</span></label></li>` +
      `<li style="list-style:none;margin:0;"><label style="display:flex;gap:0.45rem;"><input type="radio" disabled /><span>False</span></label></li>` +
      `</ul>`
    );
  }

  return renderUnsupported(node.sourceType);
}

function renderRichHtml(html: string, forHtml: (src: string) => string): string {
  return rewriteUrls(sanitizeHtml(html), forHtml);
}

function renderUnsupported(library: string): string {
  return (
    `<div style="height:100%;border:1px solid #c00;background:rgba(255,0,0,0.05);" ` +
    `title="${escapeHtml(`Unsupported in slide: ${library}`)}">` +
    `<small style="color:#c00;">${escapeHtml(library)}</small>` +
    `</div>`
  );
}

function stretchMediaHtml(html: string): string {
  return (
    `<div style="width:100%;height:100%;">` +
    html.replace(
      /<(iframe|video)\b/i,
      `<$1 style="display:block;width:100%;height:100%;max-width:100%;max-height:100%;border:0;"`
    ) +
    `</div>`
  );
}

function pct(v: number): string {
  // Clamp to a sane range; H5P sometimes emits slightly-over-100 values.
  const clamped = Math.max(-50, Math.min(150, v));
  return `${Math.round(clamped * 1000) / 1000}%`;
}
