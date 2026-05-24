import type { IdeviceDescriptor } from "./types";

export const beforeAfter: IdeviceDescriptor = {
  kind: "before-after",
  fixture: "image-juxtaposition.h5p",
  minPageCount: 1,
  previewMustContain: '[data-idevice-type="beforeafter"], .beforeafter-IDevice'
};
