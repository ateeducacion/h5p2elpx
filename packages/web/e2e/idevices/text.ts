import type { IdeviceDescriptor } from "./types";

export const text: IdeviceDescriptor = {
  kind: "text",
  fixture: "accordion.h5p",
  minPageCount: 1,
  previewMustContain: '[data-idevice-type="text"], .exe-text',
  // accordion.h5p panels include this passage; if accordion body text is
  // dropped during conversion, this fails.
  previewMustIncludeText: "sweet cherries"
};
