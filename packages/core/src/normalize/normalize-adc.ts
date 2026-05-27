import type { AdcComponent, AdcPackage, AdcResourceRef } from "../adc/types.ts";
import { decodeEntities } from "../adc/entities.ts";
import { uniqueId } from "../utils/slug.ts";
import type { NormalizedAnswer, NormalizedNode, NormalizedPageNode } from "./nodes.ts";

/**
 * Walk an `AdcPackage` and emit the input-format-agnostic AST consumed by
 * the rest of the converter. Each ADC component name is mapped to a
 * `NormalizedNode` kind below; unknown components are recursed into when
 * they have children, else reported as `unsupported`.
 */
export type NormalizeAdcOptions = {
  /** How to render the first `pageContent` (the cover/portada). */
  coverStyle?: "rich" | "minimal";
};

export function normalizeAdcPackage(
  pkg: AdcPackage,
  options: NormalizeAdcOptions = {}
): NormalizedNode {
  const ctx: AdcCtx = { pkg, seen: new Set(), coverStyle: options.coverStyle ?? "rich" };
  const root = visit(pkg.rootId, ctx);
  if (root.kind === "container") return root;
  return {
    id: uniqueId("adc-root"),
    sourceType: "ADC.Module",
    kind: "container",
    children: [root]
  };
}

type AdcCtx = {
  pkg: AdcPackage;
  seen: Set<string>;
  coverStyle: "rich" | "minimal";
};

function visit(id: string, ctx: AdcCtx): NormalizedNode {
  if (ctx.seen.has(id)) return unsupported(`ADC.Cycle:${id}`, "Cycle in component tree");
  ctx.seen.add(id);
  const comp = ctx.pkg.components.get(id);
  if (!comp) return unsupported(`ADC.Missing:${id}`, `Component ${id} not found`);
  return dispatch(comp, ctx);
}

function dispatch(comp: AdcComponent, ctx: AdcCtx): NormalizedNode {
  switch (comp.name) {
    case "module":
      return adaptModule(comp, ctx);
    case "pageContent":
      return adaptPageContent(comp, ctx);
    case "text":
    case "creditsImage":
      return adaptText(comp);
    case "image":
      return adaptImage(comp);
    case "allTypeVideo":
      return adaptVideo(comp);
    case "audio":
      return adaptAudio(comp);
    case "cite":
      return adaptCite(comp);
    case "headerIcon":
      return adaptHeaderIcon(comp);
    case "instruction":
      return adaptInstruction(comp);
    case "launcher":
      return adaptLauncher(comp);
    case "quiz":
      return adaptQuiz(comp, ctx);
    case "teacherContent":
      return adaptTeacherContent(comp, ctx);
    case "accordion":
    case "accordionItem":
    case "tabs":
    case "tabsItem":
    case "panel":
    case "popupSingle":
    case "popupBlock":
    case "table":
      return adaptContainerAsText(comp, ctx);
    case "blocks":
    case "row":
    case "column":
    case "columnActivity":
    case "pageBlock":
    case "activityNoInteractive":
    case "hiddenBlock":
    case "footerPage":
    case "footerPageBlock":
    case "footerPageCommon":
    case "notesPage":
    case "qWording":
      return adaptContainer(comp, ctx);
    case "interface":
      // Holds site-wide chrome (logo, header colours, glossary). We skip
      // rendering it as a page but keep its children traversable so any
      // embedded text/image still surfaces.
      return adaptContainer(comp, ctx);
    default:
      if (comp.componentChildren.length > 0) return adaptContainer(comp, ctx);
      return unsupported(`ADC.${comp.name}`, `Unmapped ADC component "${comp.name}"`);
  }
}

/**
 * `teacherContent` is the ADC component for material that should only be
 * visible in teacher mode. Maps 1:1 to eXeLearning's `teacherOnly` block
 * flag: emit a `container` carrying `teacherOnly: true`, and the convert
 * dispatcher pushes the flag onto every block created while it walks the
 * children. The CSS class `teacher-only` then hides the rendered HTML
 * from learners unless they toggle teacher mode on.
 */
function adaptTeacherContent(comp: AdcComponent, ctx: AdcCtx): NormalizedNode {
  // Same post-processing as `adaptContainer` so headings inside teacher
  // boxes (often wrapped in row > column > text) collapse and label the
  // following iDevice the way they do everywhere else.
  const children = groupMediaClusters(
    absorbHeadings(
      flattenSingleChildContainers(comp.componentChildren.map((cid) => visit(cid, ctx)))
    ),
    ctx
  );
  return {
    id: uniqueId("adc-teacher"),
    sourceType: "ADC.teacherContent",
    kind: "container",
    teacherOnly: true,
    children
  };
}

function adaptModule(comp: AdcComponent, ctx: AdcCtx): NormalizedNode {
  // Module is a logical wrapper, not a renderable page. Return a `container`
  // so the convert dispatcher just iterates the children into the host page
  // (no double-page wrap). The first `pageContent` we find (typically inside
  // a `pageBlock` child) is the cover and gets the rich treatment.
  const out: NormalizedNode[] = [];
  let coverConsumed = false;
  for (const cid of comp.componentChildren) {
    const child = ctx.pkg.components.get(cid);
    if (!child) continue;
    if (child.name === "footerPageBlock") {
      const footer = adaptFooterPage(child, ctx);
      if (footer) out.push(footer);
      continue;
    }
    if (!coverConsumed && (child.name === "pageBlock" || child.name === "pageContent")) {
      const { cover, rest } = liftCover(child, ctx);
      if (cover) {
        out.push(cover);
        coverConsumed = true;
      }
      out.push(...rest);
      continue;
    }
    out.push(visit(cid, ctx));
  }
  return {
    id: uniqueId("adc-module"),
    sourceType: "ADC.Module",
    kind: "container",
    children: out
  };
}

/**
 * Extract the first `pageContent` (the cover) under a `pageBlock` parent and
 * adapt it via `adaptCover`. The remaining sibling pageContents go through
 * the regular `adaptPageContent` path. Returns the cover node plus the rest.
 */
function liftCover(
  parent: AdcComponent,
  ctx: AdcCtx
): { cover: NormalizedNode | null; rest: NormalizedNode[] } {
  // `minimal` keeps the cover as a plain `adaptPageContent`, useful when
  // the author plans to rebuild the portada by hand in eXeLearning.
  const rich = ctx.coverStyle === "rich";
  if (parent.name === "pageContent") {
    return { cover: rich ? adaptCover(parent, ctx) : visit(parent.id, ctx), rest: [] };
  }
  const rest: NormalizedNode[] = [];
  let cover: NormalizedNode | null = null;
  for (const cid of parent.componentChildren) {
    const child = ctx.pkg.components.get(cid);
    if (!child) continue;
    if (!cover && child.name === "pageContent") {
      cover = rich ? adaptCover(child, ctx) : visit(cid, ctx);
      continue;
    }
    rest.push(visit(cid, ctx));
  }
  return { cover, rest };
}

function adaptPageContent(comp: AdcComponent, ctx: AdcCtx): NormalizedPageNode {
  // `properties.title` is the per-page plain-text name set by the author
  // (e.g. "Presentación de la materia"). title3Html / titleHtml are theme
  // placeholders or the course-wide banner and would repeat across pages.
  const raw =
    pickProp(comp, "title") ??
    pickProp(comp, "title3Html") ??
    pickProp(comp, "titleHtml") ??
    "Page";
  const title = stripHtml(raw);
  const children = groupMediaClusters(
    absorbHeadings(
      flattenSingleChildContainers(comp.componentChildren.map((cid) => visit(cid, ctx)))
    ),
    ctx
  );
  return {
    id: uniqueId("adc-page"),
    sourceType: "ADC.pageContent",
    kind: "page",
    title: title || "Page",
    children
  };
}

/**
 * Render the first `pageContent` (the cover / portada) as a single rich
 * text iDevice mimicking the ADC visual: full-width banner with the
 * `backgroundImage`, the category line (`index2`), the course title, and
 * the rich subtitle (`title3Html`), followed by the author / sessions
 * paragraph carried by the inner `text` child.
 *
 * The page itself keeps the course title; the rich HTML lives inside the
 * single block so the author can tweak typography in eXe afterwards.
 */
function adaptCover(comp: AdcComponent, ctx: AdcCtx): NormalizedNode {
  const title = stripHtml(pickProp(comp, "title") ?? ctx.pkg.title);
  const category = stripHtml(pickProp(comp, "index2") ?? "");
  // title3Html sometimes carries a richer subtitle (e.g. "4º ESO · Economía…")
  // — keep its inline <span style> markup but drop block-level wrappers and
  // decode entities so it renders correctly inside the banner.
  const subtitleRaw = pickProp(comp, "title3Html") ?? "";
  const subtitle = subtitleRaw
    ? decodeEntities(subtitleRaw.replace(/<\/?p[^>]*>/gi, "").trim())
    : "";

  const bgRef = pickResource(comp, "backgroundImage");
  const bg = bgRef?.url ?? bgRef?.relativePath ?? pickProp(comp, "backgroundImage");

  // The inner text child (if any) carries the author / sessions / etc.
  // ADC authors typically set these on the dark portada overlay with
  // `color:#fff*`; once we promote them to a light eXe page that becomes
  // white-on-white. Strip light text colours and white CSS shadows so the
  // text stays readable.
  const innerParts: string[] = [];
  for (const cid of comp.componentChildren) collectInlineHtml(cid, ctx, innerParts);
  const inner = stripLightTextColors(innerParts.join("\n"));

  const banner = bg
    ? `<div style="background-image:url('${escapeAttr(bg)}');background-size:cover;background-position:center;min-height:280px;display:flex;align-items:flex-end;padding:2em 1.5em;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.4);border-radius:8px"><div>${
        category
          ? `<p style="margin:0 0 .4em;font-size:.9em;letter-spacing:.05em;text-transform:uppercase;opacity:.9">${escapeHtml(category)}</p>`
          : ""
      }<h1 style="margin:0;font-size:1.9em;font-weight:700;line-height:1.15">${escapeHtml(title)}</h1>${
        subtitle ? `<div style="margin-top:.5em;font-size:1.05em">${subtitle}</div>` : ""
      }</div></div>`
    : `<header style="padding:1.5em 0"><h1 style="margin:0 0 .3em;font-size:1.9em">${escapeHtml(title)}</h1>${
        subtitle ? `<div style="margin-top:.3em">${subtitle}</div>` : ""
      }${category ? `<p style="margin:.4em 0 0;color:#666">${escapeHtml(category)}</p>` : ""}</header>`;

  const body = inner ? `<div style="padding:1em 1.5em">${inner}</div>` : "";

  return {
    id: uniqueId("adc-page"),
    sourceType: "ADC.pageContent.cover",
    kind: "page",
    title: title || "Cover",
    children: [
      {
        id: uniqueId("adc-cover"),
        sourceType: "ADC.cover",
        kind: "text",
        html: `<section style="margin:0 0 1em 0">${banner}${body}</section>`
      }
    ]
  };
}

/** Emit the `footerPageBlock` (credits, version, links) as a "Créditos y
 *  descargas" page appended at the end of the project. We always include
 *  this page when the source ADC bundle has any footer content; we also
 *  emit a short attribution iDevice noting the import provenance so the
 *  reader can trace the original Aula Digital Canaria source. */
function adaptFooterPage(comp: AdcComponent, ctx: AdcCtx): NormalizedNode | null {
  const t1 = pickProp(comp, "text1Html") ?? "";
  const t2 = pickProp(comp, "text2Html") ?? "";
  const childParts: string[] = [];
  for (const cid of comp.componentChildren) collectInlineHtml(cid, ctx, childParts);
  const html = [t1, t2, ...childParts].filter((s) => s.trim().length > 0).join("\n");
  if (!html) return null;

  const sourceName = ctx.pkg.sourceFilename ?? "";
  const projectTitle = escapeHtml(ctx.pkg.title);
  const attributionHtml = `<aside style="margin-top:1.5em;padding:1em;border-left:4px solid #999;background:#fafafa">
  <p><strong>Origen del contenido</strong></p>
  <p>${escapeHtml(`Este material se importó desde un paquete de Aula Digital Canaria (ADC).`)}</p>
  <p>${escapeHtml(`Proyecto original: ${ctx.pkg.title}`)}</p>${
    sourceName ? `\n  <p>${escapeHtml(`Archivo de origen: ${sourceName}`)}</p>` : ""
  }
  <p>${escapeHtml(
    "Conserva la licencia y autoría del proyecto original al redistribuir o adaptar este contenido."
  )}</p>
</aside>`;

  return {
    id: uniqueId("adc-footer"),
    sourceType: "ADC.footerPageBlock",
    kind: "page",
    title: "Créditos y descargas",
    children: [
      {
        id: uniqueId("adc-footer-text"),
        sourceType: "ADC.footerPageBlock",
        kind: "text",
        html
      },
      {
        id: uniqueId("adc-footer-attribution"),
        sourceType: "ADC.footerPageBlock.attribution",
        kind: "text",
        title: projectTitle,
        html: attributionHtml
      }
    ]
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function adaptText(comp: AdcComponent): NormalizedNode {
  const html = pickProp(comp, "textContent") ?? pickProp(comp, "title3Html") ?? "";
  return {
    id: uniqueId("adc-text"),
    sourceType: `ADC.${comp.name}`,
    kind: "text",
    html
  };
}

/**
 * `qTrueFalseActivity` is a list of statements each marked `correct=
 * "true"|"false"`. Maps to a real eXeLearning **trueorfalse iDevice**:
 * emit a container with the wording text (when present) and one
 * `kind:"question"` (`questionType:"truefalse"`) per `qTrueFalseOption`.
 * The convert dispatcher's `case "question"` then turns each into a
 * `buildTrueOrFalseIdevice` call — the learner gets a working quiz, not
 * a wall of plain statements.
 */
function adaptTrueFalseActivity(comp: AdcComponent, ctx: AdcCtx): NormalizedNode {
  const wording = extractWording(comp, ctx);
  const out: NormalizedNode[] = [];
  if (wording) {
    out.push({
      id: uniqueId("adc-tf-intro"),
      sourceType: "ADC.qTrueFalseActivity",
      kind: "text",
      html: wording
    });
  }
  for (const cid of comp.componentChildren) {
    const child = ctx.pkg.components.get(cid);
    if (!child || child.name !== "qTrueFalseOption") continue;
    const prompt = extractInlineText(child.id, ctx);
    if (!prompt) continue;
    const correct = /^(true|1)$/i.test(pickProp(child, "correct") ?? "");
    out.push({
      id: uniqueId("adc-tf-q"),
      sourceType: "ADC.qTrueFalseOption",
      kind: "question",
      questionType: "truefalse",
      prompt: `<p>${escapeHtml(prompt)}</p>`,
      answers: [
        { text: "true", correct },
        { text: "false", correct: !correct }
      ]
    });
  }
  if (out.length === 0) {
    return {
      id: uniqueId("adc-tf-empty"),
      sourceType: "ADC.qTrueFalseActivity",
      kind: "text",
      html: wording || "<p>True / false quiz (sin enunciados).</p>"
    };
  }
  return {
    id: uniqueId("adc-tf"),
    sourceType: "ADC.qTrueFalseActivity",
    kind: "container",
    children: out
  };
}

/** Authoring tool placeholders that survive when the author never renames
 *  the component. Treated as "no title" so they don't pollute eXe block
 *  names with generic strings like "Video Title", "Audio Title", etc. */
const PLACEHOLDER_TITLES = new Set([
  "Video Title",
  "Audio Title",
  "Image",
  "Image Title",
  "Page Title",
  "Page Title 2",
  "Page Title 3",
  "Title",
  "Subtitle Header",
  "Title button",
  "Launcher",
  "Audio Title"
]);

function meaningfulTitle(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed || PLACEHOLDER_TITLES.has(trimmed)) return undefined;
  return trimmed;
}

function adaptImage(comp: AdcComponent): NormalizedNode {
  // altia stores the resolved URL under resourceProperties.srcName.url;
  // native stores the author-typed relative path as a plain `srcName`
  // property (e.g. "Imagenes/foo.jpg"). Asset URL resolution happens later
  // in the converter via forHtml, which understands both shapes.
  const ref = pickResource(comp, "srcName");
  const src =
    ref?.url ?? ref?.relativePath ?? pickProp(comp, "srcName") ?? pickProp(comp, "srcImage") ?? "";
  if (!src) return unsupported("ADC.image", "Image without srcName");
  return {
    id: uniqueId("adc-image"),
    sourceType: "ADC.image",
    kind: "image",
    src,
    alt: pickProp(comp, "alt") ?? pickProp(comp, "title"),
    title: meaningfulTitle(pickProp(comp, "title"))
  };
}

function adaptVideo(comp: AdcComponent): NormalizedNode {
  const url = pickProp(comp, "url");
  const mp4 = pickResource(comp, "srcMp4")?.url ?? pickProp(comp, "srcMp4");
  const cover = pickResource(comp, "srcCover")?.url ?? pickProp(comp, "srcCover");
  const src = mp4 || url || "";
  if (!src) return unsupported("ADC.allTypeVideo", "Video without url/srcMp4");
  if (/^https?:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)/i.test(src)) {
    return {
      id: uniqueId("adc-video"),
      sourceType: "ADC.allTypeVideo",
      kind: "iframe",
      title: meaningfulTitle(pickProp(comp, "title")),
      src
    };
  }
  return {
    id: uniqueId("adc-video"),
    sourceType: "ADC.allTypeVideo",
    kind: "video",
    src,
    poster: cover,
    title: meaningfulTitle(pickProp(comp, "title"))
  };
}

function adaptContainer(comp: AdcComponent, ctx: AdcCtx): NormalizedNode {
  const children = comp.componentChildren.map((cid) => visit(cid, ctx));
  return {
    id: uniqueId("adc-container"),
    sourceType: `ADC.${comp.name}`,
    kind: "container",
    children: groupMediaClusters(absorbHeadings(flattenSingleChildContainers(children)), ctx)
  };
}

/**
 * Collapse sibling `[text, media, text]` runs into a single rich-text node
 * so eXeLearning gets one iDevice that contains intro paragraph + media +
 * caption — the way ADC laid the page out. Without this, each piece becomes
 * its own block and the visual relationship between a video and its caption
 * is lost.
 *
 * Heuristic: scan left-to-right; when a single media leaf (`image`, `video`,
 * `audio`, `iframe`) is found, look at one immediate `text` sibling before
 * and one after — if either qualifies, fold them together. Only the
 * immediate neighbours are merged: longer runs are conservative non-merges
 * to avoid swallowing unrelated content.
 */
function groupMediaClusters(nodes: NormalizedNode[], ctx: AdcCtx): NormalizedNode[] {
  const out: NormalizedNode[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    if (!isMediaLeaf(node)) {
      out.push(node);
      continue;
    }
    const prev = out.length > 0 ? out[out.length - 1]! : null;
    const next = nodes[i + 1] ?? null;
    const intro = prev && prev.kind === "text" ? prev : null;
    const caption = next && next.kind === "text" ? next : null;
    if (!intro && !caption) {
      out.push(node);
      continue;
    }
    if (intro) out.pop();
    if (caption) i++;
    out.push(mergeMediaCluster(intro, node, caption, ctx));
  }
  return out;
}

/**
 * ADC layouts often wrap a single text/image/quiz leaf in a chain of
 * structural containers — `row → column → text`, or `column → text`. Once
 * normalized those collapse into nested `kind:"container"` nodes that
 * eXeLearning doesn't need (the convert dispatcher just iterates them
 * anyway), and they hide leaves from sibling-based passes like
 * `groupMediaClusters` and `absorbHeadings`.
 *
 * Walk the list once and replace every `container` whose only child is
 * meaningful with that child, recursively. Containers with `teacherOnly`
 * are preserved untouched — the flag is meaningful for the convert layer.
 */
function flattenSingleChildContainers(nodes: NormalizedNode[]): NormalizedNode[] {
  const out: NormalizedNode[] = [];
  for (const node of nodes) {
    if (node.kind !== "container") {
      out.push(node);
      continue;
    }
    if (node.teacherOnly) {
      out.push({ ...node, children: flattenSingleChildContainers(node.children) });
      continue;
    }
    const flat = flattenSingleChildContainers(node.children);
    if (flat.length === 1) {
      out.push(flat[0]!);
    } else {
      out.push({ ...node, children: flat });
    }
  }
  return out;
}

/**
 * Promote standalone heading-only text nodes (`<h1>…<h6>` with no other
 * content) to the `title` of the next sibling node, and drop the standalone
 * iDevice. The convert dispatcher uses the first iDevice's `title` as the
 * eXe block name, so the heading ends up labelling the block (rendered in
 * the editor next to the "Ocultar/Mostrar contenido" toggle) rather than
 * floating as a tiny standalone text iDevice above it.
 *
 * Only triggers when the next sibling has no title yet — never overwrites
 * an existing one. Headings at the end of the list (no follow-up sibling)
 * stay as standalone text iDevices.
 */
function absorbHeadings(nodes: NormalizedNode[]): NormalizedNode[] {
  const out: NormalizedNode[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    if (node.kind !== "text") {
      out.push(node);
      continue;
    }
    const headingText = extractHeadingText(node.html);
    if (!headingText) {
      out.push(node);
      continue;
    }
    const next = nodes[i + 1];
    if (!next || next.title) {
      out.push(node);
      continue;
    }
    next.title = headingText;
    // Skip pushing the standalone heading node — its text is now the
    // block name of the next iDevice.
  }
  return out;
}

/** Returns the plain text of a heading-only HTML snippet, or null when the
 *  html carries any non-heading content. Tolerates a wrapping `<p>` or
 *  `<div>` and ignores leading/trailing whitespace. */
function extractHeadingText(html: string): string | null {
  let s = html.trim();
  // Peel off a single wrapping <p>/<div> that contains only the heading.
  const wrap = s.match(/^<(p|div)\b[^>]*>([\s\S]*)<\/\1>$/i);
  if (wrap) s = wrap[2]!.trim();
  const m = s.match(/^<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>$/i);
  if (!m) return null;
  const text = decodeEntities(m[2]!.replace(/<[^>]+>/g, "")).trim();
  return text.length > 0 ? text : null;
}

function isMediaLeaf(node: NormalizedNode): boolean {
  return (
    node.kind === "image" ||
    node.kind === "video" ||
    node.kind === "audio" ||
    node.kind === "iframe"
  );
}

function mergeMediaCluster(
  intro: NormalizedNode | null,
  media: NormalizedNode,
  caption: NormalizedNode | null,
  ctx: AdcCtx
): NormalizedNode {
  const parts: string[] = [];
  if (intro && intro.kind === "text") parts.push(intro.html);
  parts.push(renderMediaInline(media, ctx, caption?.kind === "text" ? caption.html : ""));
  // Preserve any title the media node carried (typically set by
  // `absorbHeadings` from a preceding `<hN>` sibling) so the merged
  // cluster still ends up as a named block in the eXe output.
  const title = media.title ?? (intro?.kind === "text" ? intro.title : undefined);
  const out: NormalizedNode = {
    id: uniqueId("adc-media-cluster"),
    sourceType: media.sourceType,
    kind: "text",
    html: parts.join("\n")
  };
  if (title) out.title = title;
  return out;
}

/** Render a media leaf as standalone HTML (the same shape eXeLearning's
 *  text iDevice would accept), optionally with a `<figcaption>` carrying the
 *  caption text from the trailing sibling. Asset URLs stay verbatim — the
 *  convert layer's `rewriteUrls` then maps them to `{{context_path}}/…`. */
function renderMediaInline(media: NormalizedNode, _ctx: AdcCtx, captionHtml: string): string {
  if (media.kind === "image") {
    const alt = escapeAttr(media.alt ?? media.title ?? "");
    const caption = captionHtml
      ? `<figcaption>${captionHtml}</figcaption>`
      : media.caption
        ? `<figcaption>${escapeHtml(media.caption)}</figcaption>`
        : "";
    return `<figure><img src="${escapeAttr(media.src)}" alt="${alt}" />${caption}</figure>`;
  }
  if (media.kind === "audio") {
    const caption = captionHtml ? `<figcaption>${captionHtml}</figcaption>` : "";
    return `<figure><audio controls src="${escapeAttr(media.src)}"></audio>${caption}</figure>`;
  }
  if (media.kind === "video") {
    const poster = media.poster ? ` poster="${escapeAttr(media.poster)}"` : "";
    const caption = captionHtml ? `<figcaption>${captionHtml}</figcaption>` : "";
    return `<figure><video controls src="${escapeAttr(media.src)}"${poster}></video>${caption}</figure>`;
  }
  if (media.kind === "iframe") {
    const w = media.width ? ` width="${media.width}"` : "";
    const h = media.height ? ` height="${media.height}"` : "";
    const caption = captionHtml ? `<figcaption>${captionHtml}</figcaption>` : "";
    return `<figure><iframe src="${escapeAttr(media.src)}"${w}${h} allowfullscreen></iframe>${caption}</figure>`;
  }
  return "";
}

/**
 * For containers whose visual identity matters (accordion, tabs, table) but
 * for which we don't have a 1:1 iDevice, fold every descendant text/image into
 * a single rich-text block. Better than dropping the content; the author can
 * restructure it in eXeLearning afterwards.
 */
function adaptContainerAsText(comp: AdcComponent, ctx: AdcCtx): NormalizedNode {
  const parts: string[] = [];
  const title = pickProp(comp, "titleHtml") ?? pickProp(comp, "title");
  if (title) parts.push(`<h3>${title}</h3>`);
  collectInlineHtml(comp.id, ctx, parts);
  return {
    id: uniqueId("adc-grouped"),
    sourceType: `ADC.${comp.name}`,
    kind: "text",
    html: parts.join("\n")
  };
}

function collectInlineHtml(id: string, ctx: AdcCtx, out: string[]): void {
  const comp = ctx.pkg.components.get(id);
  if (!comp) return;
  switch (comp.name) {
    case "text":
    case "creditsImage": {
      const html = pickProp(comp, "textContent");
      if (html) out.push(html);
      break;
    }
    case "image": {
      const ref = pickResource(comp, "srcName");
      const src = ref?.url ?? ref?.relativePath;
      if (src) {
        const alt = escapeAttr(pickProp(comp, "alt") ?? pickProp(comp, "title") ?? "");
        out.push(`<figure><img src="${src}" alt="${alt}" /></figure>`);
      }
      break;
    }
    case "qWording":
    case "accordionItem":
    case "tabsItem": {
      const title = pickProp(comp, "titleHtml") ?? pickProp(comp, "title");
      if (title) out.push(`<h4>${title}</h4>`);
      for (const cid of comp.componentChildren) collectInlineHtml(cid, ctx, out);
      break;
    }
    default: {
      for (const cid of comp.componentChildren) collectInlineHtml(cid, ctx, out);
    }
  }
}

function adaptQuiz(comp: AdcComponent, ctx: AdcCtx): NormalizedNode {
  // Quiz is a container that holds one or more *activities*. ADC supports
  // many activity types and each maps differently to eXeLearning:
  //  - quizActivity / *Activity with qOption[correct]: form (selection)
  //  - qEssayActivity: free-text → blanks question with empty answer slot
  //  - qTapTapActivity: matching pairs → text iDevice listing pairs + key
  //  - qDragAndDropActivity: sequence/grouping → text iDevice with list
  //  - qDrawActivity: drawing → text iDevice with prompt + canvas image
  const questions: NormalizedNode[] = [];
  for (const cid of comp.componentChildren) {
    const child = ctx.pkg.components.get(cid);
    if (!child) continue;
    switch (child.name) {
      case "qEssayActivity":
        questions.push(adaptEssayActivity(child, ctx));
        break;
      case "qTapTapActivity":
        questions.push(adaptTapTapActivity(child, ctx));
        break;
      case "qDragAndDropActivity":
        questions.push(adaptDragAndDropActivity(child, ctx));
        break;
      case "qDrawActivity":
        questions.push(adaptDrawActivity(child, ctx));
        break;
      case "quizActivity":
        questions.push(adaptMultiChoiceActivity(child, ctx));
        break;
      case "qComboActivity":
        questions.push(adaptComboActivity(child, ctx));
        break;
      case "qFillInActivity":
        questions.push(adaptFillInActivity(child, ctx));
        break;
      case "qLikertActivity":
        questions.push(adaptLikertActivity(child, ctx));
        break;
      case "qSpeakingActivity":
        questions.push(adaptSpeakingActivity(child, ctx));
        break;
      case "qTrueFalseActivity":
        questions.push(adaptTrueFalseActivity(child, ctx));
        break;
      default:
        questions.push(visit(cid, ctx));
    }
  }
  return {
    id: uniqueId("adc-quiz"),
    sourceType: "ADC.quiz",
    kind: "container",
    title: pickProp(comp, "title3Html") ?? "Quiz",
    children: questions
  };
}

/** Gather the `qWording` child's rich HTML — the question prompt that ADC
 *  shows above every activity. Falls back to the activity's titleHtml. */
function extractWording(activity: AdcComponent, ctx: AdcCtx): string {
  for (const cid of activity.componentChildren) {
    const child = ctx.pkg.components.get(cid);
    if (child?.name === "qWording") {
      const buf: string[] = [];
      collectInlineHtml(child.id, ctx, buf);
      const joined = buf.join("\n").trim();
      if (joined) return joined;
    }
  }
  return pickProp(activity, "titleHtml") ?? pickProp(activity, "title") ?? "";
}

/** Pull plain text out of a component's direct text/image children — used to
 *  describe drag-target / tap-target labels for matching activities. */
function extractInlineText(id: string, ctx: AdcCtx): string {
  const parts: string[] = [];
  collectInlineHtml(id, ctx, parts);
  return parts
    .join(" ")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function adaptEssayActivity(comp: AdcComponent, ctx: AdcCtx): NormalizedNode {
  const wording = extractWording(comp, ctx);
  const prompt = wording || "Question";
  const answers: NormalizedAnswer[] = [{ text: "" }];
  return {
    id: uniqueId("adc-essay"),
    sourceType: "ADC.qEssayActivity",
    kind: "question",
    questionType: "blanks",
    prompt,
    answers
  };
}

/**
 * `quizActivity` is the canonical multiple-choice activity. Each
 * `quizOption` child carries `correct: "true"|"false"` plus inner text;
 * map them to a single eXeLearning form (selection) question.
 */
function adaptMultiChoiceActivity(comp: AdcComponent, ctx: AdcCtx): NormalizedNode {
  const wording = extractWording(comp, ctx);
  const answers: NormalizedAnswer[] = [];
  for (const cid of comp.componentChildren) {
    const child = ctx.pkg.components.get(cid);
    if (!child || child.name !== "quizOption") continue;
    const text = extractInlineText(child.id, ctx) || pickProp(child, "titleHtml") || "";
    if (!text) continue;
    const correctRaw = pickProp(child, "correct") ?? "";
    answers.push({ text, correct: /^(true|1)$/i.test(correctRaw) });
  }
  if (answers.length === 0) {
    // No options resolved — fall back to a readable text iDevice rather
    // than emitting an unsupported placeholder.
    return {
      id: uniqueId("adc-quiz-text"),
      sourceType: "ADC.quizActivity",
      kind: "text",
      html: wording || "<p>Quiz</p>"
    };
  }
  const correctCount = answers.filter((a) => a.correct).length;
  return {
    id: uniqueId("adc-quiz-q"),
    sourceType: "ADC.quizActivity",
    kind: "question",
    questionType: "multichoice",
    prompt: wording || "Question",
    answers,
    selectionType: correctCount > 1 ? "multiple" : "single"
  };
}

/**
 * `qTapTapActivity` pairs items from the first column (`qTapTapOrigin`)
 * with items from the second (`qTapTapTarget`). Each origin holds the id
 * of its correct target in `correct`. eXeLearning's **flipcards** iDevice
 * is the natural target: each pair becomes a card with the origin text on
 * the front and the matched target text on the back. The author can leave
 * it as flipcards or switch to memory-game mode (3) in the editor.
 *
 * When wording is set, it is emitted as a sibling text node before the
 * flipcards (so the activity intro survives).
 */
function adaptTapTapActivity(comp: AdcComponent, ctx: AdcCtx): NormalizedNode {
  const wording = extractWording(comp, ctx);
  const origins: Array<{ text: string; targetId: string }> = [];
  const targets = new Map<string, string>();
  for (const cid of comp.componentChildren) {
    const child = ctx.pkg.components.get(cid);
    if (!child) continue;
    if (child.name === "qTapTapOrigin") {
      origins.push({
        text: extractInlineText(child.id, ctx),
        targetId: pickProp(child, "correct") ?? ""
      });
    } else if (child.name === "qTapTapTarget") {
      targets.set(child.id, extractInlineText(child.id, ctx));
    }
  }
  const cards = origins
    .map((o) => ({ front: o.text, back: targets.get(o.targetId) ?? "" }))
    .filter((c) => c.front || c.back);
  if (cards.length === 0) {
    return {
      id: uniqueId("adc-taptap-empty"),
      sourceType: "ADC.qTapTapActivity",
      kind: "text",
      html: wording || "<p>Actividad de emparejar (sin pares).</p>"
    };
  }
  const flip: NormalizedNode = {
    id: uniqueId("adc-taptap"),
    sourceType: "ADC.qTapTapActivity",
    kind: "flipcards",
    title: stripHtml(wording) || "Empareja",
    cards
  };
  if (!wording) return flip;
  return {
    id: uniqueId("adc-taptap-wrap"),
    sourceType: "ADC.qTapTapActivity",
    kind: "container",
    children: [
      {
        id: uniqueId("adc-taptap-intro"),
        sourceType: "ADC.qTapTapActivity",
        kind: "text",
        html: wording
      },
      flip
    ]
  };
}

/**
 * `qDragAndDropActivity` is typically used to order or group items. The
 * activity body lives in `rowActivity` → `columnActivity` cells (text or
 * image). We surface the wording + the list of items as a sequence so the
 * eXe author can rebuild the activity as a Form fill-in if needed.
 */
function adaptDragAndDropActivity(comp: AdcComponent, ctx: AdcCtx): NormalizedNode {
  const wording = extractWording(comp, ctx);
  const items: string[] = [];
  function collectColumns(id: string): void {
    const c = ctx.pkg.components.get(id);
    if (!c) return;
    if (c.name === "columnActivity") {
      const buf: string[] = [];
      collectInlineHtml(c.id, ctx, buf);
      const html = buf.join(" ").trim();
      if (html) items.push(html);
      return;
    }
    for (const cid of c.componentChildren) collectColumns(cid);
  }
  for (const cid of comp.componentChildren) collectColumns(cid);

  const parts: string[] = [];
  if (wording) parts.push(`<div>${wording}</div>`);
  if (items.length) {
    parts.push(`<ol>${items.map((it) => `<li>${it}</li>`).join("")}</ol>`);
  }
  parts.push(
    `<p><em>${escapeHtml("Actividad de arrastrar y soltar — eXeLearning no tiene un iDevice equivalente; los elementos se listan en el orden original.")}</em></p>`
  );
  return {
    id: uniqueId("adc-dnd"),
    sourceType: "ADC.qDragAndDropActivity",
    kind: "text",
    html: parts.join("\n")
  };
}

/**
 * `qDrawActivity` is a free-drawing exercise over a background image
 * (`qDrawOption.backgroundImage`). No eXe equivalent; render the prompt
 * and the canvas image with a note explaining the limitation.
 */
function adaptDrawActivity(comp: AdcComponent, ctx: AdcCtx): NormalizedNode {
  const wording = extractWording(comp, ctx);
  let bg = "";
  for (const cid of comp.componentChildren) {
    const child = ctx.pkg.components.get(cid);
    if (child?.name === "qDrawOption") {
      bg =
        pickResource(child, "backgroundImage")?.url ??
        pickResource(child, "backgroundImage")?.relativePath ??
        pickProp(child, "backgroundImage") ??
        "";
      if (bg) break;
    }
  }
  const parts: string[] = [];
  if (wording) parts.push(`<div>${wording}</div>`);
  if (bg) {
    parts.push(`<figure><img src="${escapeAttr(bg)}" alt="" /></figure>`);
  }
  parts.push(
    `<p><em>${escapeHtml("Actividad de dibujo — eXeLearning no tiene un iDevice equivalente; arriba se muestra el lienzo original.")}</em></p>`
  );
  return {
    id: uniqueId("adc-draw"),
    sourceType: "ADC.qDrawActivity",
    kind: "text",
    html: parts.join("\n")
  };
}

/* -------------------------------------------------------------------------- *
 *  Small leaf adapters (cite, audio, headerIcon, instruction, launcher)
 * -------------------------------------------------------------------------- */

/** `cite` is a quote callout: rich quote text + author byline. Render as a
 *  semantic `<blockquote>` so eXe themes can style it consistently and the
 *  author can edit either part in the rich-text editor. */
function adaptCite(comp: AdcComponent): NormalizedNode {
  const quote = pickProp(comp, "citeHtml") ?? "";
  const author = pickProp(comp, "authorHtml") ?? "";
  const parts: string[] = [];
  if (quote) parts.push(`<blockquote>${quote}`);
  if (author) parts.push(`<footer>— ${author}</footer>`);
  if (quote || author) parts.push(`</blockquote>`);
  const html = parts.join("") || "<blockquote></blockquote>";
  return {
    id: uniqueId("adc-cite"),
    sourceType: "ADC.cite",
    kind: "text",
    html
  };
}

/** ADC's standalone `audio` component (separate from `allTypeVideo`) ships
 *  an `srcMp3` resource — surface it through the existing audio iDevice
 *  pipeline so we get the eXe `<audio controls>` widget. */
function adaptAudio(comp: AdcComponent): NormalizedNode {
  const ref = pickResource(comp, "srcMp3");
  const src = ref?.url ?? ref?.relativePath ?? pickProp(comp, "srcMp3") ?? "";
  if (!src) return unsupported("ADC.audio", "Audio without srcMp3");
  return {
    id: uniqueId("adc-audio"),
    sourceType: "ADC.audio",
    kind: "audio",
    src,
    title: meaningfulTitle(pickProp(comp, "title"))
  };
}

/** `headerIcon` is a section banner: big title plus an icon image. Emit a
 *  small inline-styled card so the visual weight of the banner survives the
 *  trip to eXe without needing a custom iDevice. */
function adaptHeaderIcon(comp: AdcComponent): NormalizedNode {
  const title =
    pickProp(comp, "titleHtml") ?? pickProp(comp, "titlehtml") ?? pickProp(comp, "title") ?? "";
  const subtitle = pickProp(comp, "title2Html") ?? pickProp(comp, "title2html") ?? "";
  const ref = pickResource(comp, "srcName");
  const icon = ref?.url ?? ref?.relativePath ?? pickProp(comp, "srcName") ?? "";
  const parts: string[] = [
    `<div style="display:flex;align-items:center;gap:1em;border-left:4px solid currentColor;padding:.6em 1em;margin:.5em 0">`
  ];
  if (icon) {
    parts.push(
      `<img src="${escapeAttr(icon)}" alt="" style="width:48px;height:auto;flex:0 0 auto" />`
    );
  }
  parts.push(`<div>${title}${subtitle ? `<div style="opacity:.7">${subtitle}</div>` : ""}</div>`);
  parts.push(`</div>`);
  return {
    id: uniqueId("adc-header-icon"),
    sourceType: "ADC.headerIcon",
    kind: "text",
    html: parts.join("")
  };
}

/** `instruction` is a one-liner hint ("Despliega la caja"). Tiny but worth
 *  preserving so the page reads the way ADC authored it. */
function adaptInstruction(comp: AdcComponent): NormalizedNode {
  const html = pickProp(comp, "titleHtml") ?? pickProp(comp, "title") ?? "";
  return {
    id: uniqueId("adc-instruction"),
    sourceType: "ADC.instruction",
    kind: "text",
    html: html ? `<p><em>${html}</em></p>` : ""
  };
}

/** `launcher` is an image button: clicking it opens a popup component in
 *  ADC. eXe has no popup primitive — render it as an image with a caption
 *  noting it was an interactive element so the author can decide whether
 *  to inline the popup content. */
function adaptLauncher(comp: AdcComponent): NormalizedNode {
  const ref = pickResource(comp, "srcName");
  const src = ref?.url ?? ref?.relativePath ?? pickProp(comp, "srcName") ?? "";
  const alt = pickProp(comp, "alt") ?? pickProp(comp, "titleHtml") ?? "";
  const html = src
    ? `<figure><img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" />${
        alt
          ? `<figcaption><em>${escapeHtml(alt)} (elemento interactivo en el original)</em></figcaption>`
          : ""
      }</figure>`
    : `<p><em>${escapeHtml(alt || "Elemento interactivo (launcher)")}</em></p>`;
  return {
    id: uniqueId("adc-launcher"),
    sourceType: "ADC.launcher",
    kind: "text",
    html
  };
}

/* -------------------------------------------------------------------------- *
 *  Activity adapters (combo, fill-in, likert, speaking)
 * -------------------------------------------------------------------------- */

/**
 * `qComboActivity` is a series of dropdown-selection rows. The structure
 * found in real ADC content is:
 *
 *   qComboActivity
 *     qWording
 *       text                      ← global instruction
 *       text (×N)                 ← one per row, the statement to classify
 *     qComboOption (×N)           ← positional pair with the row statements
 *       qComboOptionItem (×K)     ← dropdown choices
 *       correct = <item.id>       ← id of the right choice
 *
 * Maps to a *real* eXeLearning activity: emit a `container` with the global
 * instruction as a `text` node, then one `kind: "question"` (multichoice)
 * per row. The convert dispatcher turns each question into a Form iDevice
 * with `activityType: "selection"`, so the learner gets a working quiz
 * instead of a static answer key.
 */
function adaptComboActivity(comp: AdcComponent, ctx: AdcCtx): NormalizedNode {
  const wordingComp = comp.componentChildren
    .map((cid) => ctx.pkg.components.get(cid))
    .find((c): c is AdcComponent => !!c && c.name === "qWording");
  const wordingTexts = wordingComp
    ? wordingComp.componentChildren
        .map((cid) => ctx.pkg.components.get(cid))
        .filter((c): c is AdcComponent => !!c && c.name === "text")
        .map((c) => pickProp(c, "textContent") ?? "")
        .filter((s) => s.trim().length > 0)
    : [];
  // First text inside qWording is the global instruction; the rest pair
  // positionally with the qComboOption rows.
  const [globalInstruction, ...rowPrompts] = wordingTexts;

  const comboRows = comp.componentChildren
    .map((cid) => ctx.pkg.components.get(cid))
    .filter((c): c is AdcComponent => !!c && c.name === "qComboOption");

  const children: NormalizedNode[] = [];
  if (globalInstruction) {
    children.push({
      id: uniqueId("adc-combo-intro"),
      sourceType: "ADC.qComboActivity",
      kind: "text",
      html: globalInstruction
    });
  }
  comboRows.forEach((row, idx) => {
    const items = row.componentChildren
      .map((iid) => ctx.pkg.components.get(iid))
      .filter((it): it is AdcComponent => !!it && it.name === "qComboOptionItem");
    const correctId = pickProp(row, "correct") ?? "";
    const answers: NormalizedAnswer[] = items.map((it) => ({
      text: stripHtml(pickProp(it, "titleHtml") ?? pickProp(it, "title") ?? ""),
      correct: it.id === correctId
    }));
    const prompt =
      rowPrompts[idx] || `<p>${escapeHtml(pickProp(row, "title") ?? `Pregunta ${idx + 1}`)}</p>`;
    if (answers.length === 0) {
      children.push({
        id: uniqueId("adc-combo-row-text"),
        sourceType: "ADC.qComboOption",
        kind: "text",
        html: prompt
      });
      return;
    }
    children.push({
      id: uniqueId("adc-combo-row"),
      sourceType: "ADC.qComboOption",
      kind: "question",
      questionType: "multichoice",
      prompt,
      answers,
      selectionType: "single"
    });
  });

  if (children.length === 0) {
    return {
      id: uniqueId("adc-combo-empty"),
      sourceType: "ADC.qComboActivity",
      kind: "text",
      html: "<p>Actividad de selección (sin opciones).</p>"
    };
  }
  return {
    id: uniqueId("adc-combo"),
    sourceType: "ADC.qComboActivity",
    kind: "container",
    children
  };
}

/**
 * `qFillInActivity` is a fill-in-the-blank: each `qFillInOption` carries
 * the accepted answer in `correct` (or `title`). Maps cleanly to eXe's
 * Form `fill` activity — surface as a `blanks` question with the answer
 * string as `text`, so the existing `blanksToFill` converter substitutes
 * the proper `<u>answer</u>` markup downstream.
 */
function adaptFillInActivity(comp: AdcComponent, ctx: AdcCtx): NormalizedNode {
  const wording = extractWording(comp, ctx);
  const answers: NormalizedAnswer[] = [];
  function walk(id: string): void {
    const c = ctx.pkg.components.get(id);
    if (!c) return;
    if (c.name === "qFillInOption") {
      const ans = pickProp(c, "correct") ?? pickProp(c, "title") ?? "";
      if (ans) answers.push({ text: `*${ans}*` });
      return;
    }
    for (const cid of c.componentChildren) walk(cid);
  }
  for (const cid of comp.componentChildren) walk(cid);
  if (answers.length === 0) {
    return {
      id: uniqueId("adc-fillin"),
      sourceType: "ADC.qFillInActivity",
      kind: "text",
      html: wording || "<p>Fill-in question</p>"
    };
  }
  return {
    id: uniqueId("adc-fillin"),
    sourceType: "ADC.qFillInActivity",
    kind: "question",
    questionType: "blanks",
    prompt: wording || "Completa los huecos",
    answers
  };
}

/**
 * `qLikertActivity` ⇒ scale-based opinion question. Each `qLikertQuestion`
 * has the same set of `qLikertOption` columns (Nunca / A veces / Siempre).
 * No equivalent in eXe; emit a table that preserves the questions and
 * the scale columns as readable text.
 */
function adaptLikertActivity(comp: AdcComponent, ctx: AdcCtx): NormalizedNode {
  const wording = extractWording(comp, ctx);
  let scale: string[] = [];
  const questions: string[] = [];
  for (const cid of comp.componentChildren) {
    const child = ctx.pkg.components.get(cid);
    if (!child || child.name !== "qLikertQuestion") continue;
    const qText = extractInlineText(child.id, ctx);
    if (qText) questions.push(qText);
    if (scale.length === 0) {
      scale = child.componentChildren
        .map((iid) => ctx.pkg.components.get(iid))
        .filter((it): it is AdcComponent => !!it && it.name === "qLikertOption")
        .map((it) => stripHtml(pickProp(it, "titleHtml") ?? pickProp(it, "title") ?? ""))
        .filter(Boolean);
    }
  }
  const parts: string[] = [];
  if (wording) parts.push(`<div>${wording}</div>`);
  if (questions.length && scale.length) {
    parts.push(
      `<table><thead><tr><th>${escapeHtml("Pregunta")}</th>${scale.map((s) => `<th>${escapeHtml(s)}</th>`).join("")}</tr></thead><tbody>`
    );
    for (const q of questions) {
      parts.push(`<tr><td>${escapeHtml(q)}</td>${scale.map(() => `<td>☐</td>`).join("")}</tr>`);
    }
    parts.push(`</tbody></table>`);
  } else if (questions.length) {
    parts.push(`<ul>${questions.map((q) => `<li>${escapeHtml(q)}</li>`).join("")}</ul>`);
  }
  parts.push(
    `<p><em>${escapeHtml("Escala Likert — eXeLearning no tiene un iDevice equivalente; arriba se muestran las preguntas y la escala.")}</em></p>`
  );
  return {
    id: uniqueId("adc-likert"),
    sourceType: "ADC.qLikertActivity",
    kind: "text",
    html: parts.join("\n")
  };
}

/**
 * `qSpeakingActivity` asks the learner to record audio. No equivalent in
 * eXe; preserve the prompt with a clear note explaining the activity type.
 */
function adaptSpeakingActivity(comp: AdcComponent, ctx: AdcCtx): NormalizedNode {
  const wording = extractWording(comp, ctx);
  const parts: string[] = [];
  if (wording) parts.push(`<div>${wording}</div>`);
  parts.push(
    `<p><em>${escapeHtml("Actividad de grabación de audio — eXeLearning no tiene un iDevice equivalente; el estudiante grabaría su respuesta en el original.")}</em></p>`
  );
  return {
    id: uniqueId("adc-speaking"),
    sourceType: "ADC.qSpeakingActivity",
    kind: "text",
    html: parts.join("\n")
  };
}

function pickProp(comp: AdcComponent, key: string): string | undefined {
  const v = (comp.properties as Record<string, unknown>)[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function pickResource(comp: AdcComponent, key: string): AdcResourceRef | undefined {
  const rp = comp.resourceProperties;
  if (!rp || Array.isArray(rp)) return undefined;
  const v = (rp as Record<string, AdcResourceRef>)[key];
  return v && (v.url || v.relativePath) ? v : undefined;
}

function unsupported(library: string, reason: string): NormalizedNode {
  return {
    id: uniqueId("adc-unsupported"),
    sourceType: library,
    kind: "unsupported",
    originalLibrary: library,
    reason
  };
}

function stripHtml(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, "")).trim();
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/**
 * Remove inline `color: #fff…` / `color: white` declarations from arbitrary
 * HTML. ADC sets these on cover bodies, footers, banners — wherever the
 * source theme rendered text over a dark image overlay. When we promote
 * that content into a plain eXe page it becomes invisible (white on
 * white). Dropping the declaration lets the iDevice inherit eXe's default
 * dark text colour.
 */
function stripLightTextColors(html: string): string {
  const lightColor =
    /color\s*:\s*(?:#fff(?:f(?:ff)?)?|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)|rgba\(\s*255\s*,\s*255\s*,\s*255\s*,[^)]*\))\s*;?/gi;
  return html
    .replace(/style\s*=\s*"([^"]*)"/gi, (_m, css: string) => {
      const cleaned = css
        .replace(lightColor, "")
        .replace(/;\s*;+/g, ";")
        .trim();
      if (!cleaned || cleaned === ";") return "";
      return `style="${cleaned}"`;
    })
    .replace(/style\s*=\s*'([^']*)'/gi, (_m, css: string) => {
      const cleaned = css
        .replace(lightColor, "")
        .replace(/;\s*;+/g, ";")
        .trim();
      if (!cleaned || cleaned === ";") return "";
      return `style='${cleaned}'`;
    });
}
