export type AdcAsset = {
  /** Relative path inside the source zip, e.g. `resources/imagenes/foo.jpg`. */
  path: string;
  filename: string;
  mimeType?: string;
  data: Uint8Array;
};

export type AdcResourceRef = {
  url?: string;
  relativePath?: string;
  width?: number;
  height?: number;
};

export type AdcComponent = {
  id: string;
  name: string;
  parent?: string | null;
  properties: Record<string, unknown>;
  resourceProperties: Record<string, AdcResourceRef> | unknown[];
  htmlResourceProperties?: unknown;
  componentChildren: string[];
};

export type AdcFlavor =
  | "altia-zip"
  | "altia-scorm12"
  | "altia-scorm2004"
  | "altia-xapi"
  | "altia-local"
  | "altia-ntx"
  | "native-content";

export type AdcPackage = {
  flavor: AdcFlavor;
  title: string;
  language?: string;
  /** Flat component dictionary keyed by id. */
  components: Map<string, AdcComponent>;
  /** Root module id (the entry point — typically the only `module` component). */
  rootId: string;
  assets: AdcAsset[];
  sourceFilename?: string;
};
