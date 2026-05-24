import type { IdeviceDescriptor } from "./types";

export const wordSearch: IdeviceDescriptor = {
  kind: "word-search",
  fixture: "find-the-words.h5p",
  minPageCount: 1,
  previewMustContain: '[data-idevice-type="word-search"], .sopa-IDevice'
};
