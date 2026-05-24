import type { IdeviceDescriptor } from "./types";

export const crossword: IdeviceDescriptor = {
  kind: "crossword",
  fixture: "crossword.h5p",
  minPageCount: 1,
  previewMustContain: '[data-idevice-type="crossword"], .crucigrama-IDevice'
};
