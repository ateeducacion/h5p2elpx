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
  return {
    id: uniqueId("adc-teacher"),
    sourceType: "ADC.teacherContent",
    kind: "container",
    teacherOnly: true,
    children: comp.componentChildren.map((cid) => visit(cid, ctx))
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
  const children = comp.componentChildren.map((cid) => visit(cid, ctx));
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
  const innerParts: string[] = [];
  for (const cid of comp.componentChildren) collectInlineHtml(cid, ctx, innerParts);
  const inner = innerParts.join("\n");

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

/** Emit the `footerPageBlock` (credits, version, links) as a small "Créditos"
 *  page appended at the end of the project. */
function adaptFooterPage(comp: AdcComponent, ctx: AdcCtx): NormalizedNode | null {
  const t1 = pickProp(comp, "text1Html") ?? "";
  const t2 = pickProp(comp, "text2Html") ?? "";
  const childParts: string[] = [];
  for (const cid of comp.componentChildren) collectInlineHtml(cid, ctx, childParts);
  const html = [t1, t2, ...childParts].filter((s) => s.trim().length > 0).join("\n");
  if (!html) return null;
  return {
    id: uniqueId("adc-footer"),
    sourceType: "ADC.footerPageBlock",
    kind: "page",
    title: "Créditos",
    children: [
      {
        id: uniqueId("adc-footer-text"),
        sourceType: "ADC.footerPageBlock",
        kind: "text",
        html
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
    title: pickProp(comp, "title")
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
      title: pickProp(comp, "title"),
      src
    };
  }
  return {
    id: uniqueId("adc-video"),
    sourceType: "ADC.allTypeVideo",
    kind: "video",
    src,
    poster: cover,
    title: pickProp(comp, "title")
  };
}

function adaptContainer(comp: AdcComponent, ctx: AdcCtx): NormalizedNode {
  return {
    id: uniqueId("adc-container"),
    sourceType: `ADC.${comp.name}`,
    kind: "container",
    children: comp.componentChildren.map((cid) => visit(cid, ctx))
  };
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
 * of its correct target in `correct`. eXeLearning has no native pair-
 * matching iDevice, so we emit a text iDevice that prints the prompt, the
 * two columns, and the answer key (origin → target). The author can
 * convert it into a Form afterwards if desired.
 */
function adaptTapTapActivity(comp: AdcComponent, ctx: AdcCtx): NormalizedNode {
  const wording = extractWording(comp, ctx);
  const origins: Array<{ id: string; text: string; targetId: string }> = [];
  const targets = new Map<string, string>();
  for (const cid of comp.componentChildren) {
    const child = ctx.pkg.components.get(cid);
    if (!child) continue;
    if (child.name === "qTapTapOrigin") {
      origins.push({
        id: child.id,
        text: extractInlineText(child.id, ctx),
        targetId: pickProp(child, "correct") ?? ""
      });
    } else if (child.name === "qTapTapTarget") {
      targets.set(child.id, extractInlineText(child.id, ctx));
    }
  }

  const parts: string[] = [];
  if (wording) parts.push(`<div>${wording}</div>`);
  if (origins.length && targets.size) {
    parts.push(
      `<table><thead><tr><th>${escapeHtml("Elemento")}</th><th>${escapeHtml("Pareja")}</th></tr></thead><tbody>`
    );
    for (const o of origins) {
      const pair = targets.get(o.targetId) ?? "";
      parts.push(`<tr><td>${escapeHtml(o.text)}</td><td>${escapeHtml(pair)}</td></tr>`);
    }
    parts.push(`</tbody></table>`);
  } else {
    // Either origins or targets missing — at least dump every label found.
    const all = [...origins.map((o) => o.text), ...Array.from(targets.values())].filter(Boolean);
    if (all.length) parts.push(`<ul>${all.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>`);
  }
  parts.push(
    `<p><em>${escapeHtml("Actividad de emparejar (Tap-Tap) — eXeLearning no tiene un iDevice nativo equivalente; arriba se muestra la clave de respuestas.")}</em></p>`
  );
  return {
    id: uniqueId("adc-taptap"),
    sourceType: "ADC.qTapTapActivity",
    kind: "text",
    html: parts.join("\n")
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
