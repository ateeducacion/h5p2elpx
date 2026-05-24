import type { IdeviceDescriptor } from "./types";

export const externalWebsite: IdeviceDescriptor = {
  kind: "external-website",
  fixture: "iframe-embedder.h5p",
  minPageCount: 1,
  previewMustContain: '[data-idevice-type="external-website"], iframe'
};
