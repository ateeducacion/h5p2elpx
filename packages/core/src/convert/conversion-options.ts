export type LayoutMode = "blocks" | "pages" | "preserve";
export type UnsupportedMode = "keep" | "text" | "drop";

/** Themes the upstream eXeLearning static bundle ships. */
export type ThemeName = "base" | "nova" | "zen" | "neo" | "flux" | "universal";
export const KNOWN_THEMES: ThemeName[] = ["base", "nova", "zen", "neo", "flux", "universal"];

export type ConversionOptions = {
  layout: LayoutMode;
  unsupported: UnsupportedMode;
  includeOriginalH5p: boolean;
  title?: string;
  language?: string;
  strict: boolean;
  pretty?: boolean;
  templateBytes?: Uint8Array;
  /** Output theme. Must be one of the themes staged under `themes/<X>/`
   *  in the template. Defaults to `"base"`. */
  theme?: ThemeName | string;
  /** Generate `search_index.js` and reference it from every page. */
  enableSearch?: boolean;
  /** Inject MathJax into every page so `$$ ... $$` / `\(...\)` LaTeX
   *  expressions render. Adds a few KB of script tags; no asset shipped. */
  enableMathJax?: boolean;
};

export const DEFAULT_OPTIONS: ConversionOptions = {
  layout: "preserve",
  unsupported: "keep",
  includeOriginalH5p: false,
  strict: false,
  theme: "base",
  enableSearch: true,
  enableMathJax: false
};
