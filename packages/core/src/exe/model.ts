export type ElpxIdevice = {
  id: string;
  pageId: string;
  blockId: string;
  typeName: string;
  title?: string;
  htmlView: string;
  jsonProperties: unknown;
  order: number;
  visibility?: boolean;
};

export type ElpxBlock = {
  id: string;
  pageId: string;
  order: number;
  iDevices: ElpxIdevice[];
};

export type ElpxPage = {
  id: string;
  parentId?: string;
  title: string;
  order: number;
  blocks: ElpxBlock[];
};

export type ElpxResource = {
  path: string;
  data: Uint8Array;
  mimeType?: string;
};

export type ElpxProject = {
  id: string;
  title: string;
  language?: string;
  pages: ElpxPage[];
  resources: ElpxResource[];
};
