import type { IdeviceDescriptor } from "./types";

/**
 * H5P.InteractiveBook is converted into a hierarchy of pages with text and
 * other iDevices inside. We walk a handful and assert each renders.
 */
export const pageTree: IdeviceDescriptor = {
  kind: "page-tree",
  fixture: "interactive-book.h5p",
  minPageCount: 2,
  maxPagesToWalk: 4,
  // Like slide-deck, preview opens on the book index; we only assert the
  // preview rendered any content.
  previewMustContain: undefined
};
