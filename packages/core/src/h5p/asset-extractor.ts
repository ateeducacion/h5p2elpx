import type { H5PAsset, H5PPackage } from "./h5p-types.ts";
import { guessMime } from "../utils/mime.ts";

/**
 * Resource layout per eXeLearning's `doc/elpx-format/assets.md`:
 *
 *   - On disk: `content/resources/<filename>` (flat by default).
 *     Sub-folders are preserved only when the source already had them.
 *   - In `<htmlView>`: relative URL, e.g. `content/resources/photo.jpg`
 *     (or `../content/resources/photo.jpg` from `html/*.html`).
 *   - In `<jsonProperties>`: token form `{{context_path}}/photo.jpg`,
 *     resolved by the runtime to the directory above.
 *
 * To handle collisions when multiple H5P packages contribute assets, we
 * keep the original sub-folder when one exists in the H5P; bare filenames
 * are suffixed (`photo.jpg`, `photo-2.jpg`).
 */

export type AssetPlanEntry = {
  /** Path inside the .elpx ZIP, e.g. `content/resources/images/photo.jpg` */
  outPath: string;
  /** Relative URL for use in htmlView (e.g. `content/resources/...`) */
  htmlUrl: string;
  /** Token URL for use in jsonProperties (`{{context_path}}/...`) */
  jsonUrl: string;
  /** Bytes to copy into the ZIP */
  data: Uint8Array;
  /** Detected MIME type, if any */
  mimeType?: string;
};

export type AssetPlan = {
  entries: AssetPlanEntry[];
  /** Mapping from a package's relative path (`images/photo.jpg`) → entry */
  byRelPath: Map<string, AssetPlanEntry>;
};

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

    // Preserve the original sub-folder structure when present, else flat.
    const initial = relInsidePackage; // e.g. "images/photo.jpg" or "photo.jpg"
    const finalRel = this.allocate(initial);
    const entry: AssetPlanEntry = {
      outPath: `content/resources/${finalRel}`,
      htmlUrl: `content/resources/${finalRel}`,
      jsonUrl: `{{context_path}}/${finalRel}`,
      data: asset.data,
      mimeType: asset.mimeType ?? guessMime(asset.filename)
    };
    this.taken.add(finalRel);
    this.byKey.set(cacheKey, entry);
    return entry;
  }

  /** Map of every asset added so far, keyed by the package-relative path
   *  (`images/photo.jpg`). Used by URL rewriters. */
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

/** Build per-package URL mappers given a populated AssetCollector and the
 *  package whose URLs are being rewritten. Returns one mapper for HTML
 *  contexts (relative paths) and one for JSON contexts ({{context_path}}). */
export function buildUrlRewriters(perPackage: Map<string, AssetPlanEntry>) {
  function rewrite(src: string, picker: (e: AssetPlanEntry) => string): string {
    if (!src) return src;
    if (/^https?:|^data:|^mailto:|^tel:|^#/i.test(src)) return src;
    const normalized = src.replace(/^\.?\//, "");
    const entry = perPackage.get(normalized);
    if (entry) return picker(entry);
    return src;
  }
  return {
    forHtml: (src: string) => rewrite(src, (e) => e.htmlUrl),
    forJson: (src: string) => rewrite(src, (e) => e.jsonUrl)
  };
}

/** Convenience: return all H5P assets unchanged (used by callers that
 *  want to know what was in the package before planning paths). */
export function extractAssets(pkg: H5PPackage): H5PAsset[] {
  return pkg.assets;
}
