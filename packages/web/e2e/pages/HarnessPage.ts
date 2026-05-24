import type { Page } from "@playwright/test";
import { buildElpxFromH5p } from "../helpers/core-build";

declare global {
  interface Window {
    __exeMessages: Array<{ type: string; [key: string]: unknown }>;
    openElpx: (
      bytes: number[] | ArrayBuffer,
      filename: string
    ) => Promise<{
      open: { type: string; [key: string]: unknown };
      document: { type: string; pageCount?: number } | null;
    }>;
    getProjectInfo: () => Promise<{ type: string; projectId?: string; pageCount?: number }>;
    getState: () => Promise<{ type: string; hasProject?: boolean; pageCount?: number }>;
    requestExport: (format: string) => Promise<{ type: string }>;
    requestSave: () => Promise<{ type: string; data?: { bytes?: ArrayBuffer } }>;
  }
}

const EDITOR_URL = process.env.EXELEARNING_EDITOR_URL ?? "/exe/";

export class HarnessPage {
  constructor(readonly page: Page) {}

  async navigate(): Promise<void> {
    const href = `/harness/exe-editor-harness.html?editorUrl=${encodeURIComponent(EDITOR_URL)}`;
    await this.page.goto(href);
  }

  /** Convert an H5P fixture in Node, then load the resulting .elpx into the editor via postMessage. */
  async openH5p(h5pName: string): Promise<{ pageCount: number; projectId: string }> {
    const built = await buildElpxFromH5p(h5pName);
    await this.navigate();
    const result = await this.page.evaluate(
      async ({ bytes, filename }) => await window.openElpx(bytes, filename),
      { bytes: Array.from(built.bytes), filename: built.filename }
    );
    if (result.open.type !== "OPEN_FILE_SUCCESS") {
      throw new Error(
        `OPEN_FILE failed for ${h5pName}: ${JSON.stringify(result.open).slice(0, 400)}`
      );
    }
    if (result.document?.type !== "DOCUMENT_LOADED") {
      throw new Error(`DOCUMENT_LOADED never arrived for ${h5pName}`);
    }
    const info = await this.page.evaluate(() => window.getProjectInfo());
    if (info.type !== "PROJECT_INFO" || !info.projectId) {
      throw new Error(`Bad PROJECT_INFO for ${h5pName}: ${JSON.stringify(info)}`);
    }
    return { pageCount: info.pageCount ?? 0, projectId: info.projectId };
  }
}
