import type { IdeviceDescriptor } from "./types";

export const trueFalse: IdeviceDescriptor = {
  kind: "true-false",
  fixture: "true-false-question.h5p",
  minPageCount: 1,
  // Asserting the image is present is implicit via the in-question <img>
  // embedded by the adapter (see truefalse adapter + convert.ts question
  // branch). If the media is dropped this selector still matches the
  // iDevice, but `previewMustIncludeText` would still pass — so we also
  // assert an `<img>` exists below in the spec.
  previewMustContain: '[data-idevice-type="trueorfalse"], .exe-trueorfalse-container',
  // Source H5P statement; if the converter ever drops the prompt, this fails.
  previewMustIncludeText: "Oslo is the capital of Norway"
};
