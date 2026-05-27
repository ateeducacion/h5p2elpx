import type { AdcComponent, AdcPackage, AdcResourceRef } from "../adc/types.ts";
import { uniqueId } from "../utils/slug.ts";
import type { NormalizedAnswer, NormalizedNode, NormalizedPageNode } from "./nodes.ts";

/**
 * Walk an `AdcPackage` and emit the input-format-agnostic AST consumed by
 * the rest of the converter. Each ADC component name is mapped to a
 * `NormalizedNode` kind below; unknown components are recursed into when
 * they have children, else reported as `unsupported`.
 */
export function normalizeAdcPackage(pkg: AdcPackage): NormalizedNode {
  const ctx: AdcCtx = { pkg, seen: new Set() };
  const root = visit(pkg.rootId, ctx);
  if (root.kind === "page" || root.kind === "container") return root;
  return {
    id: uniqueId("adc-root"),
    sourceType: "ADC.Module",
    kind: "page",
    title: pkg.title,
    children: [root]
  };
}

type AdcCtx = {
  pkg: AdcPackage;
  seen: Set<string>;
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
    case "teacherContent":
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

function adaptModule(comp: AdcComponent, ctx: AdcCtx): NormalizedNode {
  const pages = comp.componentChildren
    .map((cid) => visit(cid, ctx))
    .filter((n) => n.kind !== "unsupported" || hasMeaningfulChildren(n));
  return {
    id: uniqueId("adc-module"),
    sourceType: "ADC.Module",
    kind: "page",
    title: ctx.pkg.title,
    children: pages
  };
}

function hasMeaningfulChildren(_n: NormalizedNode): boolean {
  return false;
}

function adaptPageContent(comp: AdcComponent, ctx: AdcCtx): NormalizedPageNode {
  const titleHtml =
    pickProp(comp, "title3Html") ?? pickProp(comp, "titleHtml") ?? pickProp(comp, "title");
  const title = titleHtml ? stripHtml(titleHtml) : "Page";
  const children = comp.componentChildren.map((cid) => visit(cid, ctx));
  return {
    id: uniqueId("adc-page"),
    sourceType: "ADC.pageContent",
    kind: "page",
    title,
    children
  };
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
  const ref = pickResource(comp, "srcName");
  const src = ref?.url ?? ref?.relativePath ?? "";
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
  const mp4 = pickResource(comp, "srcMp4")?.url;
  const cover = pickResource(comp, "srcCover")?.url;
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
  // SA1 fixture only carries qEssayActivity (free-text); we map essay
  // questions to a `text` node with the wording + an empty answer area.
  // Multiple-choice quizzes would surface qOption children with `correct`
  // flags — handled here when present.
  const questions: NormalizedNode[] = [];
  for (const cid of comp.componentChildren) {
    const child = ctx.pkg.components.get(cid);
    if (!child) continue;
    if (child.name === "qEssayActivity") questions.push(adaptEssayActivity(child, ctx));
    else questions.push(visit(cid, ctx));
  }
  return {
    id: uniqueId("adc-quiz"),
    sourceType: "ADC.quiz",
    kind: "container",
    title: pickProp(comp, "title3Html") ?? "Quiz",
    children: questions
  };
}

function adaptEssayActivity(comp: AdcComponent, ctx: AdcCtx): NormalizedNode {
  let wording = "";
  for (const cid of comp.componentChildren) {
    const child = ctx.pkg.components.get(cid);
    if (child?.name === "qWording") {
      const buf: string[] = [];
      collectInlineHtml(child.id, ctx, buf);
      wording = buf.join("\n");
      break;
    }
  }
  const prompt = wording || pickProp(comp, "titleHtml") || "Question";
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
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
