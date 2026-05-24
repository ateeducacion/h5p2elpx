import type { IdeviceDescriptor } from "./types";

export const trueFalse: IdeviceDescriptor = {
  kind: "true-false",
  fixture: "true-false-question.h5p",
  minPageCount: 1,
  previewMustContain: '[data-idevice-type="trueorfalse"], .exe-trueorfalse-container'
};
