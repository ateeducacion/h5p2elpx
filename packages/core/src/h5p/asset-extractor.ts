import type { H5PAsset, H5PPackage } from "./h5p-types.ts";
import { guessMime } from "../utils/mime.ts";

/**
 * Resource layout per eXeLearning's `doc/elpx-format/assets.md`:
 *
 *   - On disk: `content/resources/<filename>` (flat). eXeLearning treats
 *     the root of `content/resources/` as where assets live unless the
 *     **author** organised them in folders. H5P's internal `images/`,
 *     `audios/`, `videos/`, `files/` subdirectories are storage convention,
 *     not user choices, so we drop them on the way out.
 *   - In `<htmlView>` and `<jsonProperties>` (both inside `content.xml`):
 *     the path-template form `{{context_path}}/<filename>`. eXe's importer
 *     converts that back to `asset://<uuid>` on load via
 *     `convertContextPathToAssetRefs()`; the page renderer resolves it to
 *     a relative path at HTML render time.
 *
 * Collisions across packages are resolved by suffixing the basename
 * (`photo.jpg`, `photo-2.jpg`).
 */

export type AssetPlanEntry = {
  /** Path inside the .elpx ZIP, e.g. `content/resources/photo.jpg` */
  outPath: string;
  /** URL token to embed in BOTH htmlView and jsonProperties (per assets.md
   *  the same `{{context_path}}/...` form is used in both). */
  url: string;
  data: Uint8Array;
  mimeType?: string;
};

/** H5P stores assets under one of these well-known subfolders; eXe doesn't
 *  use any of them — they get flattened out. Anything else is treated as
 *  an author-chosen folder and preserved. */
const H5P_INTERNAL_DIRS = /^(images|audios|videos|files|content)\/+/i;

function flattenH5pPath(rel: string): string {
  return rel.replace(H5P_INTERNAL_DIRS, "");
}

export class AssetCollector {
  private taken = new Set<string>();
  private byKey = new Map<string, AssetPlanEntry>();

  /** Returns the planned entry for an asset; if the same `(path, bytes)`
   *  pair was added before it is returned unchanged (deduped). */
  add(pkg: H5PPackage, asset: H5PAsset): AssetPlanEntry {
    const relInsidePackage = asset.path.replace(/^content\//, "");
    const cacheKey = `${pkg.sourceFilename ?? "pkg"}|${relInsidePackage}`;
    const cached = this.byKey.get(cacheKey);
    if (cached) return cached;

    const flat = flattenH5pPath(relInsidePackage);
    const finalRel = this.allocate(flat);
    const entry: AssetPlanEntry = {
      outPath: `content/resources/${finalRel}`,
      url: `{{context_path}}/${finalRel}`,
      data: asset.data,
      mimeType: asset.mimeType ?? guessMime(asset.filename)
    };
    this.taken.add(finalRel);
    this.byKey.set(cacheKey, entry);
    return entry;
  }

  /** Map of every asset added so far, keyed by the original package-relative
   *  path (e.g. `images/photo.jpg`) so URL rewriters can find an entry when
   *  H5P content references the asset by its source path. */
  perPackage(pkg: H5PPackage): Map<string, AssetPlanEntry> {
    const out = new Map<string, AssetPlanEntry>();
    const prefix = `${pkg.sourceFilename ?? "pkg"}|`;
    for (const [k, v] of this.byKey) {
      if (k.startsWith(prefix)) out.set(k.slice(prefix.length), v);
    }
    return out;
  }

  all(): AssetPlanEntry[] {
    return Array.from(this.byKey.values());
  }

  /** Find a free relative path, suffixing `-2`, `-3`, … on the basename
   *  to avoid clobbering an existing entry. */
  private allocate(rel: string): string {
    if (!this.taken.has(rel)) return rel;
    const lastSlash = rel.lastIndexOf("/");
    const dir = lastSlash === -1 ? "" : rel.slice(0, lastSlash + 1);
    const file = lastSlash === -1 ? rel : rel.slice(lastSlash + 1);
    const dot = file.lastIndexOf(".");
    const stem = dot === -1 ? file : file.slice(0, dot);
    const ext = dot === -1 ? "" : file.slice(dot);
    let i = 2;
    while (true) {
      const candidate = `${dir}${stem}-${i}${ext}`;
      if (!this.taken.has(candidate)) return candidate;
      i += 1;
    }
  }
}

/** URL rewriter — same `{{context_path}}/<file>` form is used in both
 *  `htmlView` and `jsonProperties` (the importer converts to `asset://`
 *  on load; the page renderer resolves to a relative path at HTML render
 *  time). Both names are kept for backward compatibility with callers. */
export function buildUrlRewriters(perPackage: Map<string, AssetPlanEntry>) {
  function rewrite(src: string): string {
    if (!src) return src;
    if (/^https?:|^data:|^mailto:|^tel:|^#/i.test(src)) return src;
    const normalized = src.replace(/^\.?\//, "");
    const entry = perPackage.get(normalized);
    if (entry) return entry.url;
    return src;
  }
  return { forHtml: rewrite, forJson: rewrite };
}

export function extractAssets(pkg: H5PPackage): H5PAsset[] {
  return pkg.assets;
}
