export type LayoutMode = "blocks" | "pages" | "preserve";
export type UnsupportedMode = "keep" | "text" | "drop";

export type ConversionOptions = {
  layout: LayoutMode;
  unsupported: UnsupportedMode;
  includeOriginalH5p: boolean;
  title?: string;
  language?: string;
  strict: boolean;
  pretty?: boolean;
  templateBytes?: Uint8Array;
};

export const DEFAULT_OPTIONS: ConversionOptions = {
  layout: "preserve",
  unsupported: "keep",
  includeOriginalH5p: false,
  strict: false
};
