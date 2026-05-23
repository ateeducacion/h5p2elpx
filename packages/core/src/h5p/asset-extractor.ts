import type { H5PAsset, H5PPackage } from "./h5p-types.ts";

/**
 * Build a path remapping function for an H5P package's assets.
 * H5P content references look like `images/photo.jpg` (relative to `content/`).
 * In the elpx output, assets live under `resources/h5p2elpx/<activityId>/<rel>`.
 */
export function buildAssetRewriter(activityId: string, pkg: H5PPackage) {
  const knownRelPaths = new Set(
    pkg.assets.map((a) => a.path.replace(/^content\//, ""))
  );
  return (src: string): string => {
    if (!src) return src;
    if (/^https?:|^data:|^mailto:|^tel:|^#/i.test(src)) return src;
    const normalized = src.replace(/^\.?\//, "");
    if (knownRelPaths.has(normalized)) {
      return `resources/h5p2elpx/${activityId}/${normalized}`;
    }
    // best effort even if not seen
    return `resources/h5p2elpx/${activityId}/${normalized}`;
  };
}

export function extractAssets(pkg: H5PPackage): H5PAsset[] {
  return pkg.assets;
}
