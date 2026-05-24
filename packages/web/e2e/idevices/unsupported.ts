import type { IdeviceDescriptor } from "./types";

export const unsupported: IdeviceDescriptor = {
  kind: "unsupported",
  fixture: "H5PMath.h5p",
  minPageCount: 1,
  previewMustContain: ".h5p2elpx-unsupported, .idevice_node"
};
