export type H5PLibraryRef = {
  machineName: string;
  majorVersion?: number;
  minorVersion?: number;
  patchVersion?: number;
};

export type H5PAsset = {
  path: string;
  filename: string;
  mimeType?: string;
  data: Uint8Array;
};

export type H5PPackage = {
  title: string;
  language?: string;
  mainLibrary: H5PLibraryRef;
  dependencies: H5PLibraryRef[];
  contentJson: unknown;
  assets: H5PAsset[];
  rawFiles: Map<string, Uint8Array>;
  sourceFilename?: string;
  rawH5p?: Uint8Array;
};
