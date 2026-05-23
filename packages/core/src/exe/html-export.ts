import type { ElpxBlock, ElpxIdevice, ElpxPage, ElpxProject } from "./model.ts";
import { slugify } from "../utils/slug.ts";

type ExportFile = {
  path: string;
  contents: string;
};

type PageExportMeta = {
  page: ElpxPage;
  path: string;
  fileName: string;
  titleSlug?: string;
};

export type HtmlExportOptions = {
  /** Generate `search_index.js` and link it from every page. Default: true. */
  enableSearch?: boolean;
  /** Add the MathJax v3 CDN script tag to every page. Default: false. */
  enableMathJax?: boolean;
};

export function buildExportHtmlFiles(
  project: ElpxProject,
  opts: HtmlExportOptions = {}
): ExportFile[] {
  const enableSearch = opts.enableSearch !== false;
  const enableMathJax = !!opts.enableMathJax;

  if (project.pages.length === 0) {
    return [
      {
        path: "index.html",
        contents: buildPlaceholderIndex(project.title, project.language)
      }
    ];
  }

  const pages = buildPageMeta(project.pages);
  const pageMap = new Map(pages.map((entry) => [entry.page.id, entry]));
  const files = pages.map((entry, index) => ({
    path: entry.path,
    contents: renderPage(project, pages, pageMap, entry, index, { enableSearch, enableMathJax })
  }));

  if (enableSearch) {
    files.push({
      path: "search_index.js",
      contents: `window.exeSearchData = ${JSON.stringify(buildSearchIndex(pages, pageMap))};\n`
    });
  }

  return files;
}

function buildPageMeta(pages: ElpxPage[]): PageExportMeta[] {
  const used = new Set<string>(["index"]);
  return pages.map((page, index) => {
    if (index === 0) {
      return { page, path: "index.html", fileName: "index.html" };
    }
    const base = slugify(page.title) || `page-${index + 1}`;
    let slug = base;
    let attempt = 2;
    while (used.has(slug)) {
      slug = `${base}-${attempt}`;
      attempt += 1;
    }
    used.add(slug);
    return {
      page,
      path: `html/${slug}.html`,
      fileName: `${slug}.html`,
      titleSlug: slug
    };
  });
}

function renderPage(
  project: ElpxProject,
  pages: PageExportMeta[],
  pageMap: Map<string, PageExportMeta>,
  current: PageExportMeta,
  index: number,
  opts: { enableSearch: boolean; enableMathJax: boolean }
): string {
  const prefix = current.path === "index.html" ? "" : "../";
  const types = Array.from(
    new Set(
      current.page.blocks.flatMap((block) => block.iDevices.map((idevice) => idevice.typeName))
    )
  ).sort();
  const prev = index > 0 ? pages[index - 1] : undefined;
  const next = index < pages.length - 1 ? pages[index + 1] : undefined;

  const ideviceAssets = types
    .map(
      (type) =>
        `<script src="${prefix}idevices/${type}/${type}.js"></script><link rel="stylesheet" href="${prefix}idevices/${type}/${type}.css">`
    )
    .join("\n");

  return [
    "<!DOCTYPE html>",
    `<html lang="${escapeAttr(project.language ?? "en")}" id="${escapeAttr(
      current.path === "index.html" ? "exe-index" : `exe-${current.page.id}`
    )}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(buildPageTitle(project, current.page, index === 0))}</title>`,
    `<link rel="icon" type="image/x-icon" href="${prefix}libs/favicon.ico">`,
    '<script>document.querySelector("html").classList.add("js");</script>',
    `<script src="${prefix}libs/jquery/jquery.min.js"></script>`,
    `<script src="${prefix}libs/common_i18n.js"></script>`,
    `<script src="${prefix}libs/common.js"></script>`,
    `<script src="${prefix}libs/exe_export.js"></script>`,
    opts.enableSearch ? `<script src="${prefix}search_index.js"></script>` : "",
    opts.enableMathJax
      ? '<script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" id="MathJax-script" async></script>'
      : "",
    `<script src="${prefix}libs/bootstrap/bootstrap.bundle.min.js"></script>`,
    `<link rel="stylesheet" href="${prefix}libs/bootstrap/bootstrap.min.css">`,
    ideviceAssets,
    `<link rel="stylesheet" href="${prefix}content/css/base.css">`,
    `<script src="${prefix}theme/style.js"></script>`,
    `<link rel="stylesheet" href="${prefix}theme/style.css">`,
    '<meta name="robots" content="noindex,nofollow" />',
    "</head>",
    '<body class="exe-export exe-web-site">',
    '<script>document.body.className+=" js"</script>',
    '<div class="exe-content exe-export pre-js siteNav-hidden">',
    `<a href="#${escapeAttr(current.page.id)}" id="skipNav">Skip to content</a>`,
    '<nav id="siteNav">',
    renderNav(pages, current, pageMap),
    "</nav>",
    `<main id="${escapeAttr(current.page.id)}" class="page">`,
    '<div id="exe-client-search"></div>',
    '<header class="main-header">',
    `<div class="package-header"><p class="package-title">${escapeHtml(project.title)}</p></div>`,
    `<div class="page-header"><h1 class="page-title">${escapeHtml(current.page.title)}</h1></div>`,
    "</header>",
    `<div id="page-content-${escapeAttr(current.page.id)}" class="page-content">`,
    current.page.blocks.map((block) => renderBlock(block, current, pageMap)).join("\n"),
    "</div>",
    '<nav class="pagination noprt">',
    prev
      ? `<a href="${escapeAttr(relativeHref(current.path, prev.path))}" class="prev"><span><span>&laquo; </span>Previous</span></a>`
      : "",
    next
      ? `<a href="${escapeAttr(relativeHref(current.path, next.path))}" class="next"><span>Next<span> &raquo;</span></span></a>`
      : "",
    "</nav>",
    "</main>",
    "</div>",
    "</body>",
    "</html>"
  ]
    .filter(Boolean)
    .join("\n");
}

function renderBlock(
  block: ElpxBlock,
  current: PageExportMeta,
  pageMap: Map<string, PageExportMeta>
): string {
  const title = block.iDevices.find((idevice) => idevice.title?.trim())?.title?.trim();
  const hasTitle = Boolean(title);
  return [
    `<article id="${escapeAttr(block.id)}" class="box${hasTitle ? "" : " no-header"}">`,
    '<header class="box-head no-icon">',
    hasTitle ? `<h1 class="box-title">${escapeHtml(title!)}</h1>` : "",
    '<button class="box-toggle box-toggle-on" title="Toggle content">',
    "<span>Toggle content</span>",
    "</button>",
    "</header>",
    '<div class="box-content">',
    block.iDevices.map((idevice) => renderIdevice(idevice, current, pageMap)).join("\n"),
    "</div>",
    "</article>"
  ]
    .filter(Boolean)
    .join("\n");
}

function renderIdevice(
  idevice: ElpxIdevice,
  current: PageExportMeta,
  pageMap: Map<string, PageExportMeta>
): string {
  const prefix = current.path === "index.html" ? "" : "../";
  const htmlView = rewriteExportString(idevice.htmlView, prefix, current.path, pageMap);
  const jsonData = JSON.stringify(
    rewriteJsonValue(idevice.jsonProperties, prefix, current.path, pageMap)
  );
  return [
    `<div id="${escapeAttr(idevice.id)}" class="idevice_node ${escapeAttr(idevice.typeName)}" data-idevice-path="${escapeAttr(
      `${prefix}idevices/${idevice.typeName}/`
    )}" data-idevice-type="${escapeAttr(idevice.typeName)}" data-idevice-component-type="json" data-idevice-json-data="${escapeAttr(
      jsonData
    )}">`,
    htmlView,
    "</div>"
  ].join("\n");
}

function renderNav(
  pages: PageExportMeta[],
  current: PageExportMeta,
  pageMap: Map<string, PageExportMeta>
): string {
  const children = new Map<string | undefined, PageExportMeta[]>();
  for (const page of pages) {
    const key = page.page.parentId;
    const list = children.get(key) ?? [];
    list.push(page);
    children.set(key, list);
  }
  for (const list of children.values()) {
    list.sort((a, b) => a.page.order - b.page.order);
  }

  return renderNavList(children.get(undefined) ?? [], children, current, pageMap);
}

function renderNavList(
  entries: PageExportMeta[],
  children: Map<string | undefined, PageExportMeta[]>,
  current: PageExportMeta,
  pageMap: Map<string, PageExportMeta>
): string {
  return [
    "<ul>",
    ...entries.map((entry) => {
      const nested = children.get(entry.page.id) ?? [];
      const classes = [
        entry.page.id === current.page.id ? "active" : "",
        nested.length > 0 ? "daddy" : "",
        nested.length === 0 && entry.path === "index.html" ? "main-node no-ch" : "",
        nested.length === 0 && entry.path !== "index.html" ? "no-ch" : ""
      ]
        .filter(Boolean)
        .join(" ");
      return [
        `<li${entry.page.id === current.page.id ? ' class="active"' : ""}>`,
        `<a href="${escapeAttr(relativeHref(current.path, entry.path))}" class="${escapeAttr(
          classes || "no-ch"
        )}">${escapeHtml(entry.page.title)}</a>`,
        nested.length > 0 ? renderNavList(nested, children, current, pageMap) : "",
        "</li>"
      ]
        .filter(Boolean)
        .join("\n");
    }),
    "</ul>"
  ].join("\n");
}

function buildSearchIndex(pages: PageExportMeta[], pageMap: Map<string, PageExportMeta>) {
  return Object.fromEntries(
    pages.map((entry, index) => [
      entry.page.id,
      {
        name: entry.page.title,
        isIndex: index === 0,
        fileName: entry.fileName,
        fileUrl: entry.path,
        prePageId: index > 0 ? pages[index - 1]!.page.id : null,
        nextPageId: index < pages.length - 1 ? pages[index + 1]!.page.id : null,
        blocks: Object.fromEntries(
          entry.page.blocks.map((block) => [
            block.id,
            {
              name: block.iDevices.find((idevice) => idevice.title?.trim())?.title ?? "",
              order: block.order + 1,
              idevices: Object.fromEntries(
                block.iDevices.map((idevice) => [
                  idevice.id,
                  {
                    order: idevice.order + 1,
                    htmlView: rewriteExportString(idevice.htmlView, "", entry.path, pageMap),
                    jsonProperties: JSON.stringify(
                      rewriteJsonValue(idevice.jsonProperties, "", entry.path, pageMap)
                    )
                  }
                ])
              )
            }
          ])
        )
      }
    ])
  );
}

function rewriteJsonValue(
  value: unknown,
  prefix: string,
  currentPath: string,
  pageMap: Map<string, PageExportMeta>
): unknown {
  if (typeof value === "string") {
    return rewriteExportString(value, prefix, currentPath, pageMap);
  }
  if (Array.isArray(value)) {
    return value.map((item) => rewriteJsonValue(item, prefix, currentPath, pageMap));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        rewriteJsonValue(nested, prefix, currentPath, pageMap)
      ])
    );
  }
  return value;
}

function rewriteExportString(
  value: string,
  prefix: string,
  currentPath: string,
  pageMap: Map<string, PageExportMeta>
): string {
  let out = value
    .replace(/\{\{context_path\}\}\/(?:content\/resources\/)?/g, `${prefix}content/resources/`)
    .replace(/(["'(])content\/resources\//g, `$1${prefix}content/resources/`);

  for (const [pageId, meta] of pageMap) {
    out = out.replaceAll(`exe-node:${pageId}`, relativeHref(currentPath, meta.path));
  }

  return out;
}

function relativeHref(fromPath: string, toPath: string): string {
  if (fromPath === toPath)
    return fromPath === "index.html" ? "index.html" : toPath.replace(/^html\//, "");
  if (fromPath === "index.html") return toPath;
  if (toPath === "index.html") return "../index.html";
  return `../${toPath}`;
}

function buildPageTitle(project: ElpxProject, page: ElpxPage, isIndex: boolean): string {
  return isIndex ? project.title : `${page.title} | ${project.title}`;
}

function buildPlaceholderIndex(title: string, language?: string): string {
  return `<!DOCTYPE html><html lang="${escapeAttr(language ?? "en")}"><head><meta charset="UTF-8"><title>${escapeHtml(
    title
  )}</title></head><body><h1>${escapeHtml(title)}</h1></body></html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}
