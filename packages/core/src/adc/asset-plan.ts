import type { AdcPackage } from "./types.ts";
import type { ElpxResource } from "../exe/model.ts";

export type AdcAssetPlan = {
  /** Rewrites an ADC-style resource URL (`resources/foo.jpg`) into the
   *  `{{context_path}}/...` token eXeLearning's content.xml expects. */
  toUrl: (src: string) => string;
  resources: ElpxResource[];
};

/**
 * ADC assets live under `resources/<...>` inside the source ZIP. eXeLearning
 * stores them under `content/resources/<...>` and references them via the
 * `{{context_path}}/<...>` placeholder. This planner builds both sides at
 * once so the normalizer/emitter can rewrite URLs without re-walking the
 * asset list.
 */
export function planAdcAssets(pkg: AdcPackage): AdcAssetPlan {
  const urlMap = new Map<string, string>();
  const resources: ElpxResource[] = [];
  const taken = new Set<string>();

  for (const asset of pkg.assets) {
    const inner = stripResourcesPrefix(asset.path);
    const finalRel = allocate(taken, inner);
    const outPath = `content/resources/${finalRel}`;
    const url = `{{context_path}}/${finalRel}`;

    // Register every URL form we may encounter in component data:
    // - "resources/<inner>" (the form the JSON serialiser emits)
    // - "/resources/<inner>" (some bundles include the leading slash)
    // - "<inner>" (when an authoring tool stripped the prefix)
    urlMap.set(`resources/${inner}`, url);
    urlMap.set(`/resources/${inner}`, url);
    urlMap.set(inner, url);
    // Case-insensitive fallback — the ADC authoring tool lowercases paths
    // in `url` but the original `relativePath` may carry mixed case.
    urlMap.set(`resources/${inner}`.toLowerCase(), url);

    resources.push({ path: outPath, data: asset.data, mimeType: asset.mimeType });
  }

  return {
    toUrl(src: string): string {
      if (!src) return src;
      if (/^(https?:|mailto:|tel:|data:|#)/i.test(src)) return src;
      const normalized = src.replace(/^\.?\//, "");
      return urlMap.get(normalized) ?? urlMap.get(normalized.toLowerCase()) ?? src;
    },
    resources
  };
}

function stripResourcesPrefix(path: string): string {
  return path.replace(/^resources\//i, "");
}

function allocate(taken: Set<string>, rel: string): string {
  if (!taken.has(rel)) {
    taken.add(rel);
    return rel;
  }
  const slash = rel.lastIndexOf("/");
  const dir = slash === -1 ? "" : rel.slice(0, slash + 1);
  const file = slash === -1 ? rel : rel.slice(slash + 1);
  const dot = file.lastIndexOf(".");
  const stem = dot === -1 ? file : file.slice(0, dot);
  const ext = dot === -1 ? "" : file.slice(dot);
  for (let i = 2; ; i++) {
    const candidate = `${dir}${stem}-${i}${ext}`;
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
  }
}
