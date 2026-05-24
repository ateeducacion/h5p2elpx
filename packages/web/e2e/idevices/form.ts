import type { IdeviceDescriptor } from "./types";

export const form: IdeviceDescriptor = {
  kind: "form",
  fixture: "LumiH5PIDMultiChoiceTest.h5p",
  minPageCount: 1,
  previewMustContain: '[data-idevice-type="form"], .exe-form-questions'
};
