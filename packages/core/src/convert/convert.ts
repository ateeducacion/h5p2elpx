import type { H5PPackage } from "../h5p/h5p-types.ts";
import { readH5p } from "../h5p/read-h5p.ts";
import { normalizePackage } from "../normalize/normalize.ts";
import type { NormalizedNode, NormalizedSlideDeckNode } from "../normalize/nodes.ts";
import { AssetCollector, buildUrlRewriters } from "../h5p/asset-extractor.ts";
import { readAdc } from "../adc/read-adc.ts";
import type { AdcPackage } from "../adc/types.ts";
import { planAdcAssets } from "../adc/asset-plan.ts";
import { normalizeAdcPackage } from "../normalize/normalize-adc.ts";
import { rewriteUrls, sanitizeHtml, escapeHtml } from "../utils/html.ts";
import { buildVideoEmbed } from "../utils/embed.ts";
import { buildCpSlideHtml } from "./cp-slide-html.ts";
import { libraryRefString } from "../h5p/library-ref.ts";
import {
  buildTextIdevice,
  buildUnsupportedIdevice,
  buildTrueOrFalseIdevice,
  buildFormIdevice,
  buildFlipcardsIdevice,
  buildCrosswordIdevice,
  buildInteractiveVideoIdevice,
  buildBeforeAfterIdevice,
  buildExternalWebsiteIdevice,
  buildWordSearchIdevice,
  buildMapIdevice,
  blanksToFill,
  type FormQuestion,
  type SelectionQuestion
} from "../exe/idevices/index.ts";
import { newBlockId, newPageId, newProjectId } from "../exe/ids.ts";
import type { ElpxBlock, ElpxIdevice, ElpxPage, ElpxProject, ElpxResource } from "../exe/model.ts";
import { writeElpx } from "../exe/elpx-writer.ts";
import { DEFAULT_OPTIONS, type ConversionOptions } from "./conversion-options.ts";
import { TOOL_VERSION } from "../version.ts";
import {
  emptyReport,
  type ConversionActivityReport,
  type ConversionReport,
  type UnsupportedItemReport
} from "../report/conversion-report.ts";

export type ConvertInput =
  | { kind: "h5p-bytes"; data: Uint8Array; filename: string }
  | { kind: "h5p-package"; pkg: H5PPackage }
  /** Unknown ZIP — sniffed at convert time (ADC zip/scorm/xapi/local/native,
   *  falling back to H5P). Use this from CLI/web entry points where the user
   *  may drop either format. */
  | { kind: "zip-bytes"; data: Uint8Array; filename: string }
  | { kind: "adc-bytes"; data: Uint8Array; filename: string }
  | { kind: "adc-package"; pkg: AdcPackage };

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
  const assets = new AssetCollector();
  const originals: Array<{ name: string; data: Uint8Array }> = [];

  // Resolve every input up-front so we can derive a sensible project title /
  // language from the first one when the caller didn't pass --title / --lang.
  const resolvedInputs = await Promise.all(inputs.map((i) => resolveInput(i, opts)));
  const firstResolved = resolvedInputs[0];

  const project: ElpxProject = {
    id: newProjectId(),
    title: opts.title ?? firstResolved?.title ?? "Imported content",
    language: opts.language ?? firstResolved?.language,
    pages: [],
    resources: []
  };

  let singlePage: ElpxPage | null = null;
  if (opts.layout === "blocks") {
    singlePage = {
      id: newPageId(),
      title: project.title,
      order: 0,
      blocks: []
    };
    project.pages.push(singlePage);
  }

  const adcResources: ElpxResource[] = [];

  for (const resolved of resolvedInputs) {
    const sourceFile = resolved.sourceFile;
    report.input.files.push(sourceFile);

    const activityReport: ConversionActivityReport = {
      sourceFile,
      title: resolved.title,
      mainLibrary: resolved.mainLibrary,
      status: "converted",
      mappedTo: [],
      unsupportedItems: [],
      warnings: [],
      errors: []
    };

    let forHtml: (src: string) => string;
    let forJson: (src: string) => string;
    let ast: NormalizedNode;

    if (resolved.kind === "h5p") {
      const pkg = resolved.pkg;
      // Plan all asset paths up-front so the URL rewriter resolves both
      // htmlView and jsonProperties URLs consistently.
      for (const asset of pkg.assets) assets.add(pkg, asset);
      const perPkg = assets.perPackage(pkg);
      const rewriters = buildUrlRewriters(perPkg);
      forHtml = rewriters.forHtml;
      forJson = rewriters.forJson;

      if (opts.includeOriginalH5p && pkg.rawH5p) {
        originals.push({
          name: `${sourceFile.replace(/\.h5p$/i, "") || "package"}.h5p`,
          data: pkg.rawH5p
        });
      }
      ast = normalizePackage(pkg);
    } else {
      const plan = planAdcAssets(resolved.pkg);
      adcResources.push(...plan.resources);
      forHtml = plan.toUrl;
      forJson = plan.toUrl;
      ast = normalizeAdcPackage(resolved.pkg);
    }

    const ctx: BuildCtx = {
      forHtml,
      forJson,
      activityReport,
      options: opts
    };

    let hostPage: ElpxPage;
    if (opts.layout === "blocks") {
      hostPage = singlePage!;
    } else {
      hostPage = {
        id: newPageId(),
        title: resolved.title || sourceFile,
        order: project.pages.length,
        blocks: []
      };
      project.pages.push(hostPage);
    }

    emitNode(ast, project, hostPage, ctx);

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
    throw new Error(`Strict mode: conversion contains unsupported H5P content.\n${list}`);
  }

  // Materialise the asset plan into the elpx resources list. H5P assets
  // go through the AssetCollector (which dedupes across packages); ADC
  // assets are pre-planned per package and appended verbatim.
  const resources: ElpxResource[] = assets.all().map((e) => ({
    path: e.outPath,
    data: e.data,
    mimeType: e.mimeType
  }));
  resources.push(...adcResources);
  project.resources = resources;

  const elpx = await writeElpx(project, {
    templateBytes: opts.templateBytes,
    originalH5pPackages: opts.includeOriginalH5p ? originals : undefined,
    theme: opts.theme,
    enableSearch: opts.enableSearch,
    enableMathJax: opts.enableMathJax
  });
  return { elpx, report, project };
}

type BuildCtx = {
  forHtml: (src: string) => string;
  forJson: (src: string) => string;
  activityReport: ConversionActivityReport;
  options: ConversionOptions;
};

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
  ctx: BuildCtx
): void {
  switch (node.kind) {
    case "text": {
      const block = newBlock(hostPage);
      const html = rewriteUrls(sanitizeHtml(node.html), ctx.forHtml);
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
      return;
    }
    case "image": {
      const block = newBlock(hostPage);
      const src = ctx.forHtml(node.src);
      const html = `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(node.alt ?? "")}" />${
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
      return;
    }
    case "audio": {
      const block = newBlock(hostPage);
      const src = ctx.forHtml(node.src);
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
      return;
    }
    case "video": {
      const block = newBlock(hostPage);
      const src = ctx.forHtml(node.src);
      const poster = node.poster ? ctx.forHtml(node.poster) : undefined;
      const html = buildVideoEmbed(src, poster ? { poster } : {});
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
      return;
    }
    case "question": {
      const block = newBlock(hostPage);
      if (node.questionType === "truefalse" && node.answers) {
        const trueCorrect = !!node.answers.find((a) => a.text?.toLowerCase() === "true")?.correct;
        let questionHtml = node.prompt;
        if (node.media?.src) {
          const src = ctx.forHtml(node.media.src);
          const alt = escapeHtml(node.media.alt ?? "");
          questionHtml = `<figure><img src="${escapeHtml(src)}" alt="${alt}" /></figure>${questionHtml}`;
        }
        addIdevice(
          block,
          buildTrueOrFalseIdevice({
            pageId: hostPage.id,
            blockId: block.id,
            order: 0,
            questions: [
              {
                question: questionHtml,
                feedback: node.feedback ?? "",
                suggestion: "",
                solution: trueCorrect ? 1 : 0
              }
            ]
          })
        );
        ctx.activityReport.mappedTo!.push("trueorfalse");
        return;
      }
      if (node.questionType === "multichoice" && node.answers) {
        const correctCount = node.answers.filter((a) => a.correct).length;
        const selectionType: "single" | "multiple" =
          node.selectionType ?? (correctCount > 1 ? "multiple" : "single");
        let baseText = node.prompt;
        if (node.media?.src) {
          const src = ctx.forHtml(node.media.src);
          const alt = escapeHtml(node.media.alt ?? "");
          baseText = `<figure><img src="${escapeHtml(src)}" alt="${alt}" /></figure>${baseText}`;
        }
        const q: SelectionQuestion = {
          activityType: "selection",
          selectionType,
          baseText,
          answers: node.answers.map((a) =>
            a.feedback
              ? [
                  !!a.correct,
                  rewriteUrls(sanitizeHtml(a.text), ctx.forHtml),
                  rewriteUrls(sanitizeHtml(a.feedback), ctx.forHtml)
                ]
              : [!!a.correct, rewriteUrls(sanitizeHtml(a.text), ctx.forHtml)]
          )
        };
        addIdevice(
          block,
          buildFormIdevice({
            pageId: hostPage.id,
            blockId: block.id,
            order: 0,
            questions: [q],
            feedbackAfter: node.feedback
          })
        );
        ctx.activityReport.mappedTo!.push("form(selection)");
        return;
      }
      if (node.questionType === "blanks") {
        // node.answers carries the raw blank-text strings; convert *answer* → <u>answer</u>
        const questions: FormQuestion[] = (node.answers ?? []).map((a) => blanksToFill(a.text));
        if (questions.length === 0) {
          // sometimes the prompt itself contains *answer* markers (DragText, etc.)
          questions.push(blanksToFill(node.prompt));
        }
        let instructions = node.prompt;
        if (node.media?.src) {
          const src = ctx.forHtml(node.media.src);
          const alt = escapeHtml(node.media.alt ?? "");
          instructions = `<figure><img src="${escapeHtml(src)}" alt="${alt}" /></figure>${instructions}`;
        }
        addIdevice(
          block,
          buildFormIdevice({
            pageId: hostPage.id,
            blockId: block.id,
            order: 0,
            questions,
            instructions
          })
        );
        ctx.activityReport.mappedTo!.push("form(fill)");
        return;
      }
      ctx.activityReport.unsupportedItems.push({
        sourceType: node.sourceType,
        reason: `Question type ${node.questionType} not mapped`
      });
      emitUnsupported(node.sourceType, hostPage, ctx, "Question structure could not be mapped");
      return;
    }
    case "container": {
      for (const child of node.children) emitNode(child, project, hostPage, ctx);
      return;
    }
    case "slide-deck": {
      emitSlideDeck(node, project, hostPage, ctx);
      return;
    }
    case "course-presentation": {
      const preserve = ctx.options.layout === "preserve";
      node.slides.forEach((slide, idx) => {
        const slideTitle = slide.title ?? `Slide ${idx + 1}`;
        const targetPage = preserve
          ? (() => {
              const p: ElpxPage = {
                id: newPageId(),
                parentId: hostPage.id,
                title: slideTitle,
                order: project.pages.length,
                blocks: []
              };
              project.pages.push(p);
              return p;
            })()
          : hostPage;
        const block = newBlock(targetPage);
        const html = buildCpSlideHtml(slide, ctx.forHtml);
        addIdevice(
          block,
          buildTextIdevice({
            pageId: targetPage.id,
            blockId: block.id,
            order: 0,
            title: slideTitle,
            html
          })
        );
      });
      ctx.activityReport.mappedTo!.push("course-presentation");
      return;
    }
    case "slide": {
      for (const child of node.children) emitNode(child, project, hostPage, ctx);
      return;
    }
    case "page": {
      if (ctx.options.layout === "preserve") {
        const newP: ElpxPage = {
          id: newPageId(),
          parentId: hostPage.id,
          title: node.title ?? "Page",
          order: project.pages.length,
          blocks: []
        };
        project.pages.push(newP);
        for (const c of node.children) emitNode(c, project, newP, ctx);
        return;
      }
      for (const c of node.children) emitNode(c, project, hostPage, ctx);
      return;
    }
    case "crossword": {
      const block = newBlock(hostPage);
      addIdevice(
        block,
        buildCrosswordIdevice({
          pageId: hostPage.id,
          blockId: block.id,
          order: 0,
          title: node.title,
          words: node.entries.map((e) => ({ word: e.word, definition: e.definition }))
        })
      );
      ctx.activityReport.mappedTo!.push("crossword");
      return;
    }
    case "interactive-video": {
      const block = newBlock(hostPage);
      const src = ctx.forHtml(node.src);
      const slides = node.slides.map((s) =>
        s.type === "text"
          ? { ...s, text: rewriteUrls(sanitizeHtml(s.text), ctx.forHtml) }
          : { ...s, question: rewriteUrls(sanitizeHtml(s.question), ctx.forHtml) }
      );
      addIdevice(
        block,
        buildInteractiveVideoIdevice({
          pageId: hostPage.id,
          blockId: block.id,
          order: 0,
          src,
          title: node.title,
          description: node.description,
          slides
        })
      );
      ctx.activityReport.mappedTo!.push("interactive-video");
      if (node.skippedInteractions && node.skippedInteractions.length > 0) {
        ctx.activityReport.warnings.push(
          `H5P.InteractiveVideo: dropped ${node.skippedInteractions.length} interaction(s) not mappable to eXe slides (${node.skippedInteractions.join(", ")})`
        );
      }
      return;
    }
    case "flipcards": {
      const block = newBlock(hostPage);
      addIdevice(
        block,
        buildFlipcardsIdevice({
          pageId: hostPage.id,
          blockId: block.id,
          order: 0,
          mode: node.sourceType === "H5P.MemoryGame" ? 3 : 0,
          cards: node.cards.map((c) => ({
            front: { text: rewriteUrls(sanitizeHtml(c.front), ctx.forHtml) },
            back: { text: rewriteUrls(sanitizeHtml(c.back), ctx.forHtml) }
          }))
        })
      );
      ctx.activityReport.mappedTo!.push("flipcards");
      return;
    }
    case "beforeafter": {
      const block = newBlock(hostPage);
      addIdevice(
        block,
        buildBeforeAfterIdevice({
          pageId: hostPage.id,
          blockId: block.id,
          order: 0,
          title: node.title,
          beforeSrc: ctx.forHtml(node.before.src),
          beforeLabel: node.before.label,
          beforeAlt: node.before.alt,
          afterSrc: ctx.forHtml(node.after.src),
          afterLabel: node.after.label,
          afterAlt: node.after.alt
        })
      );
      ctx.activityReport.mappedTo!.push("beforeafter");
      return;
    }
    case "iframe": {
      const block = newBlock(hostPage);
      // Local-file sources are rewritten into asset URLs; remote URLs pass
      // through forHtml unchanged.
      const src = /^https?:\/\//i.test(node.src) ? node.src : ctx.forHtml(node.src);
      addIdevice(
        block,
        buildExternalWebsiteIdevice({
          pageId: hostPage.id,
          blockId: block.id,
          order: 0,
          title: node.title,
          src,
          width: node.width,
          height: node.height
        })
      );
      ctx.activityReport.mappedTo!.push("external-website");
      return;
    }
    case "hotspot-map": {
      const block = newBlock(hostPage);
      addIdevice(
        block,
        buildMapIdevice({
          pageId: hostPage.id,
          blockId: block.id,
          order: 0,
          title: node.title,
          instructions: node.instructions,
          imageUrl: ctx.forHtml(node.imageUrl),
          imageAlt: node.title,
          isQuiz: node.isQuiz,
          points: node.points
        })
      );
      ctx.activityReport.mappedTo!.push("map");
      return;
    }
    case "word-search": {
      const block = newBlock(hostPage);
      addIdevice(
        block,
        buildWordSearchIdevice({
          pageId: hostPage.id,
          blockId: block.id,
          order: 0,
          title: node.title,
          words: node.words,
          instructions: node.taskDescription
        })
      );
      ctx.activityReport.mappedTo!.push("word-search");
      return;
    }
    case "unsupported": {
      handleUnsupported(node, hostPage, ctx);
      return;
    }
  }
}

function emitSlideDeck(
  deck: NormalizedSlideDeckNode,
  project: ElpxProject,
  hostPage: ElpxPage,
  ctx: BuildCtx
): void {
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
      for (const child of slide.children) emitNode(child, project, slidePage, ctx);
    }
    return;
  }
  for (const slide of deck.slides) {
    for (const child of slide.children) emitNode(child, project, hostPage, ctx);
  }
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

function emitUnsupported(library: string, hostPage: ElpxPage, _ctx: BuildCtx, reason: string) {
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

type ResolvedH5p = {
  kind: "h5p";
  pkg: H5PPackage;
  sourceFile: string;
  title: string;
  language?: string;
  mainLibrary: string;
};

type ResolvedAdc = {
  kind: "adc";
  pkg: AdcPackage;
  sourceFile: string;
  title: string;
  language?: string;
  mainLibrary: string;
};

async function resolveInput(
  input: ConvertInput,
  opts: ConversionOptions
): Promise<ResolvedH5p | ResolvedAdc> {
  if (input.kind === "h5p-bytes") {
    const pkg = await readH5p(input.data, {
      sourceFilename: input.filename,
      keepRawH5p: opts.includeOriginalH5p
    });
    return toResolvedH5p(pkg);
  }
  if (input.kind === "h5p-package") return toResolvedH5p(input.pkg);
  if (input.kind === "adc-bytes") {
    const pkg = await readAdc(input.data, { sourceFilename: input.filename });
    if (!pkg) throw new Error(`Not a recognised ADC bundle: ${input.filename}`);
    return toResolvedAdc(pkg);
  }
  if (input.kind === "adc-package") return toResolvedAdc(input.pkg);
  // "zip-bytes" — sniff ADC first, fall back to H5P.
  const adcPkg = await readAdc(input.data, { sourceFilename: input.filename });
  if (adcPkg) return toResolvedAdc(adcPkg);
  const h5p = await readH5p(input.data, {
    sourceFilename: input.filename,
    keepRawH5p: opts.includeOriginalH5p
  });
  return toResolvedH5p(h5p);
}

function toResolvedH5p(pkg: H5PPackage): ResolvedH5p {
  return {
    kind: "h5p",
    pkg,
    sourceFile: pkg.sourceFilename ?? "package.h5p",
    title: pkg.title,
    language: pkg.language,
    mainLibrary: libraryRefString(pkg.mainLibrary)
  };
}

function toResolvedAdc(pkg: AdcPackage): ResolvedAdc {
  return {
    kind: "adc",
    pkg,
    sourceFile: pkg.sourceFilename ?? "package.zip",
    title: pkg.title,
    language: pkg.language,
    mainLibrary: `ADC.${pkg.flavor}`
  };
}

export { TOOL_VERSION };
