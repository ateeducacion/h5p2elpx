export type IdeviceKind =
  | "text"
  | "true-false"
  | "form"
  | "flipcards"
  | "crossword"
  | "word-search"
  | "before-after"
  | "external-website"
  | "map"
  | "slide-deck"
  | "page-tree"
  | "unsupported";

export type IdeviceDescriptor = {
  kind: IdeviceKind;
  /** H5P fixture under fixtures/h5p/. */
  fixture: string;
  /** Minimum number of pages we expect the converted .elpx to contain. */
  minPageCount: number;
  /**
   * Selector that must appear inside the preview iframe body for at least
   * one of the iterated pages. Kept loose by design — we are smoke-testing.
   */
  previewMustContain?: string;
  /**
   * Plain-text substring that must appear in the preview body (case-sensitive).
   * Optional; useful when CSS selectors are too generic.
   */
  previewMustIncludeText?: string;
  /**
   * Limit how many TOC pages to walk for this kind. Slide decks and books
   * are large; covering all pages is wasteful.
   */
  maxPagesToWalk?: number;
};
