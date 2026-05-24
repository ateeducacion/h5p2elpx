import type { IdeviceDescriptor } from "./types";

/**
 * H5P.CoursePresentation is converted into a multi-page slide deck. The
 * inner iDevice content per slide is text-flavoured; we cap how many pages
 * we walk to keep the suite fast.
 */
export const slideDeck: IdeviceDescriptor = {
  kind: "slide-deck",
  fixture: "course-presentation.h5p",
  minPageCount: 2,
  maxPagesToWalk: 3,
  // Preview lands on the deck's index page; bodyLength > 100 is enough proof
  // that the export pipeline produced something. Per-page selector assertion
  // would require visiting a slide-content page before opening the preview.
  previewMustContain: undefined
};
