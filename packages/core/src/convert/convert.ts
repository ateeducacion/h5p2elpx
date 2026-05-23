import type { H5PPackage } from "../h5p/h5p-types.ts";
import { readH5p } from "../h5p/read-h5p.ts";
import { normalizePackage } from "../normalize/normalize.ts";
import type {
  NormalizedNode,
  NormalizedSlideDeckNode,
  NormalizedSlideNode,
  NormalizedPageNode,
  NormalizedContainerNode
} from "../normalize/nodes.ts";
import { buildAssetRewriter } from "../h5p/asset-extractor.ts";
import { rewriteUrls, sanitizeHtml, escapeHtml } from "../utils/html.ts";
import { slugify } from "../utils/slug.ts";
import { libraryRefString } from "../h5p/library-ref.ts";
import { guessMime } from "../utils/mime.ts";
import {
  buildTextIdevice,
  buildUnsupportedIdevice,
  buildTrueOrFalseIdevice,
  buildQuickQuestionsIdevice,
  buildFormIdevice,
  buildFlipcardsIdevice
} from "../exe/idevices/index.ts";
import { newBlockId, newPageId, newProjectId } from "../exe/ids.ts";
import type {
  ElpxBlock,
  ElpxIdevice,
  ElpxPage,
  ElpxProject,
  ElpxResource
} from "../exe/model.ts";
import { writeElpx } from "../exe/elpx-writer.ts";
import {
  DEFAULT_OPTIONS,
  type ConversionOptions
} from "./conversion-options.ts";
import {
  emptyReport,
  TOOL_VERSION,
  type ConversionActivityReport,
  type ConversionReport,
  type UnsupportedItemReport
} from "../report/conversion-report.ts";

export type ConvertInput =
  | { kind: "h5p-bytes"; data: Uint8Array; filename: string }
  | { kind: "h5p-package"; pkg: H5PPackage };

export type ConvertResult = {
  elpx: Uint8Array;
  report: ConversionReport;
  project: ElpxProject;
};

export async function convert(
  inputs: ConvertInput[],
  partial: Partial<ConversionOptions> = {}
): Promise<ConvertResult> {
  const opts: ConversionOptions = { ...DEFAULT_OPTIONS, ...partial };
  const report = emptyReport([]);
  const allResources: ElpxResource[] = [];
  const originals: Array<{ name: string; data: Uint8Array }> = [];

  const project: ElpxProject = {
    id: newProjectId(),
    title: opts.title ?? "Imported H5P content",
    language: opts.language,
    pages: [],
    resources: allResources
  };

  let pageOrder = 0;
  let singlePage: ElpxPage | null = null;

  if (opts.layout === "blocks") {
    singlePage = {
      id: newPageId(),
      title: project.title,
      order: pageOrder++,
      blocks: []
    };
    project.pages.push(singlePage);
  }

  for (const input of inputs) {
    let pkg: H5PPackage;
    if (input.kind === "h5p-bytes") {
      pkg = await readH5p(input.data, {
        sourceFilename: input.filename,
        keepRawH5p: opts.includeOriginalH5p
      });
    } else {
      pkg = input.pkg;
    }
    const sourceFile = pkg.sourceFilename ?? "package.h5p";
    report.input.files.push(sourceFile);

    const activityId = slugify(sourceFile.replace(/\.h5p$/i, ""));
    const activityReport: ConversionActivityReport = {
      sourceFile,
      title: pkg.title,
      mainLibrary: libraryRefString(pkg.mainLibrary),
      status: "converted",
      mappedTo: [],
      unsupportedItems: [],
      warnings: [],
      errors: []
    };

    // copy assets
    for (const asset of pkg.assets) {
      const rel = asset.path.replace(/^content\//, "");
      allResources.push({
        path: `content/resources/h5p2elpx/${activityId}/${rel}`,
        data: asset.data,
        mimeType: asset.mimeType ?? guessMime(asset.filename)
      });
    }
    if (opts.includeOriginalH5p && pkg.rawH5p) {
      originals.push({ name: `${activityId}.h5p`, data: pkg.rawH5p });
    }

    const rewriter = buildAssetRewriter(activityId, pkg);
    const ast = normalizePackage(pkg);

    const ctx: BuildCtx = {
      activityId,
      rewriter,
      activityReport,
      options: opts
    };

    // pick host page
    let hostPage: ElpxPage;
    if (opts.layout === "blocks") {
      hostPage = singlePage!;
    } else {
      hostPage = {
        id: newPageId(),
        title: pkg.title || sourceFile,
        order: pageOrder++,
        blocks: []
      };
      project.pages.push(hostPage);
    }

    emitNode(ast, project, hostPage, ctx, pageOrder);
    pageOrder = project.pages.length;

    // statuses
    const unsupportedCount = activityReport.unsupportedItems.length;
    if (unsupportedCount > 0) {
      activityReport.status = activityReport.mappedTo!.length > 0 ? "partial" : "unsupported";
    }
    report.summary.totalActivities += 1;
    if (activityReport.status === "converted") report.summary.converted += 1;
    else if (activityReport.status === "partial") report.summary.partiallyConverted += 1;
    else if (activityReport.status === "unsupported") report.summary.unsupported += 1;
    report.summary.warnings += activityReport.warnings.length;
    report.summary.errors += activityReport.errors.length;
    report.activities.push(activityReport);
  }

  if (opts.strict && report.summary.unsupported + report.summary.partiallyConverted > 0) {
    const list = report.activities
      .flatMap((a) => a.unsupportedItems.map((u) => `- ${u.sourceType}: ${u.reason}`))
      .join("\n");
    throw new Error(
      `Strict mode: conversion contains unsupported H5P content.\n${list}`
    );
  }

  const elpx = await writeElpx(project, {
    templateBytes: opts.templateBytes,
    originalH5pPackages: opts.includeOriginalH5p ? originals : undefined
  });
  return { elpx, report, project };
}

type BuildCtx = {
  activityId: string;
  rewriter: (src: string) => string;
  activityReport: ConversionActivityReport;
  options: ConversionOptions;
};

function ensureBlock(page: ElpxPage): ElpxBlock {
  if (page.blocks.length === 0) {
    page.blocks.push({
      id: newBlockId(),
      pageId: page.id,
      order: 0,
      iDevices: []
    });
  }
  return page.blocks[page.blocks.length - 1]!;
}

function newBlock(page: ElpxPage): ElpxBlock {
  const block: ElpxBlock = {
    id: newBlockId(),
    pageId: page.id,
    order: page.blocks.length,
    iDevices: []
  };
  page.blocks.push(block);
  return block;
}

function addIdevice(block: ElpxBlock, idev: ElpxIdevice) {
  idev.order = block.iDevices.length;
  block.iDevices.push(idev);
}

function emitNode(
  node: NormalizedNode,
  project: ElpxProject,
  hostPage: ElpxPage,
  ctx: BuildCtx,
  pageCursor: number
): number {
  switch (node.kind) {
    case "text": {
      const block = newBlock(hostPage);
      const html = rewriteUrls(sanitizeHtml(node.html), ctx.rewriter);
      addIdevice(
        block,
        buildTextIdevice({
          pageId: hostPage.id,
          blockId: block.id,
          order: 0,
          title: node.title,
          html
        })
      );
      ctx.activityReport.mappedTo!.push("text");
      return pageCursor;
    }
    case "image": {
      const block = newBlock(hostPage);
      const src = ctx.rewriter(node.src);
      const html = `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(
        node.alt ?? ""
      )}" />${
        node.caption ? `<figcaption>${escapeHtml(node.caption)}</figcaption>` : ""
      }</figure>`;
      addIdevice(
        block,
        buildTextIdevice({
          pageId: hostPage.id,
          blockId: block.id,
          order: 0,
          title: node.title ?? "Image",
          html
        })
      );
      ctx.activityReport.mappedTo!.push("text(image)");
      return pageCursor;
    }
    case "audio": {
      const block = newBlock(hostPage);
      const src = ctx.rewriter(node.src);
      const html = `<audio controls src="${escapeHtml(src)}"></audio>`;
      addIdevice(
        block,
        buildTextIdevice({
          pageId: hostPage.id,
          blockId: block.id,
          order: 0,
          title: node.title ?? "Audio",
          html
        })
      );
      ctx.activityReport.mappedTo!.push("text(audio)");
      return pageCursor;
    }
    case "video": {
      const block = newBlock(hostPage);
      const src = ctx.rewriter(node.src);
      const poster = node.poster ? ctx.rewriter(node.poster) : undefined;
      const html = `<video controls src="${escapeHtml(src)}"${
        poster ? ` poster="${escapeHtml(poster)}"` : ""
      }></video>`;
      addIdevice(
        block,
        buildTextIdevice({
          pageId: hostPage.id,
          blockId: block.id,
          order: 0,
          title: node.title ?? "Video",
          html
        })
      );
      ctx.activityReport.mappedTo!.push("text(video)");
      return pageCursor;
    }
    case "question": {
      const block = newBlock(hostPage);
      if (node.questionType === "truefalse" && node.answers) {
        const correctAns = node.answers.find((a) => a.correct)?.text?.toLowerCase();
        addIdevice(
          block,
          buildTrueOrFalseIdevice({
            pageId: hostPage.id,
            blockId: block.id,
            order: 0,
            prompt: node.prompt,
            answer: correctAns === "true"
          })
        );
        ctx.activityReport.mappedTo!.push("trueorfalse");
      } else if (node.questionType === "multichoice" && node.answers) {
        addIdevice(
          block,
          buildQuickQuestionsIdevice({
            pageId: hostPage.id,
            blockId: block.id,
            order: 0,
            prompt: node.prompt,
            answers: node.answers
          })
        );
        ctx.activityReport.mappedTo!.push("quick-questions");
      } else if (node.questionType === "blanks") {
        addIdevice(
          block,
          buildFormIdevice({
            pageId: hostPage.id,
            blockId: block.id,
            order: 0,
            prompt: node.prompt,
            questionsHtml: (node.answers ?? []).map((a) => `<p>${a.text}</p>`).join("\n")
          })
        );
        ctx.activityReport.mappedTo!.push("form");
      } else {
        ctx.activityReport.unsupportedItems.push({
          sourceType: node.sourceType,
          reason: `Question type ${node.questionType} not mapped`
        });
        emitUnsupported(node.sourceType, hostPage, ctx, "Question structure could not be mapped");
      }
      return pageCursor;
    }
    case "container": {
      for (const child of node.children) emitNode(child, project, hostPage, ctx, pageCursor);
      return pageCursor;
    }
    case "slide-deck": {
      return emitSlideDeck(node, project, hostPage, ctx, pageCursor);
    }
    case "slide": {
      const block = newBlock(hostPage);
      block.iDevices.push(); // no-op; emit children as separate blocks for clarity
      for (const child of node.children) emitNode(child, project, hostPage, ctx, pageCursor);
      return pageCursor;
    }
    case "page": {
      if (ctx.options.layout === "preserve") {
        const newP: ElpxPage = {
          id: newPageId(),
          title: node.title ?? "Page",
          order: project.pages.length,
          blocks: []
        };
        project.pages.push(newP);
        for (const c of node.children) emitNode(c, project, newP, ctx, project.pages.length);
        return project.pages.length;
      }
      for (const c of node.children) emitNode(c, project, hostPage, ctx, pageCursor);
      return pageCursor;
    }
    case "flipcards": {
      const block = newBlock(hostPage);
      addIdevice(
        block,
        buildFlipcardsIdevice({
          pageId: hostPage.id,
          blockId: block.id,
          order: 0,
          cards: node.cards
        })
      );
      ctx.activityReport.mappedTo!.push("flipcards");
      return pageCursor;
    }
    case "unsupported": {
      handleUnsupported(node, hostPage, ctx);
      return pageCursor;
    }
  }
}

function emitSlideDeck(
  deck: NormalizedSlideDeckNode,
  project: ElpxProject,
  hostPage: ElpxPage,
  ctx: BuildCtx,
  pageCursor: number
): number {
  if (ctx.options.layout === "preserve") {
    for (const slide of deck.slides) {
      const slidePage: ElpxPage = {
        id: newPageId(),
        parentId: hostPage.id,
        title: slide.title ?? "Slide",
        order: project.pages.length,
        blocks: []
      };
      project.pages.push(slidePage);
      for (const child of slide.children) emitNode(child, project, slidePage, ctx, project.pages.length);
    }
    return project.pages.length;
  }
  for (const slide of deck.slides) {
    for (const child of slide.children) emitNode(child, project, hostPage, ctx, pageCursor);
  }
  return pageCursor;
}

function handleUnsupported(
  node: Extract<NormalizedNode, { kind: "unsupported" }>,
  hostPage: ElpxPage,
  ctx: BuildCtx
) {
  const item: UnsupportedItemReport = {
    sourceType: node.originalLibrary,
    reason: node.reason
  };
  ctx.activityReport.unsupportedItems.push(item);
  if (ctx.options.unsupported === "drop") return;
  if (ctx.options.unsupported === "text") {
    const block = newBlock(hostPage);
    addIdevice(
      block,
      buildTextIdevice({
        pageId: hostPage.id,
        blockId: block.id,
        order: 0,
        title: `Unsupported: ${node.originalLibrary}`,
        html: `<p><em>Unsupported H5P content: ${escapeHtml(node.originalLibrary)}</em></p>`
      })
    );
    return;
  }
  emitUnsupported(node.originalLibrary, hostPage, ctx, node.reason);
}

function emitUnsupported(
  library: string,
  hostPage: ElpxPage,
  _ctx: BuildCtx,
  reason: string
) {
  const block = newBlock(hostPage);
  addIdevice(
    block,
    buildUnsupportedIdevice({
      pageId: hostPage.id,
      blockId: block.id,
      order: 0,
      originalLibrary: library,
      reason
    })
  );
}

export { TOOL_VERSION };
