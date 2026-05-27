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
  /** When true, the iDevice is rendered with the `teacher-only` CSS class
   *  and is hidden from learners unless eXe's teacher-mode toggle is on. */
  teacherOnly?: boolean;
};

export type ElpxBlock = {
  id: string;
  pageId: string;
  order: number;
  iDevices: ElpxIdevice[];
  /** When true, the block (and every iDevice it contains) is rendered with
   *  the `teacher-only` CSS class. Maps 1:1 to ADC's `teacherContent`. */
  teacherOnly?: boolean;
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
