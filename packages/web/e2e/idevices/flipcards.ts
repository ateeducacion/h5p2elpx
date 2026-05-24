import type { IdeviceDescriptor } from "./types";

export const flipcards: IdeviceDescriptor = {
  kind: "flipcards",
  fixture: "flashcards.h5p",
  minPageCount: 1,
  previewMustContain: '[data-idevice-type="flipcards"], .flipcards-IDevice'
};
