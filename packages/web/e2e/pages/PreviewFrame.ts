import type { FrameLocator, Page } from "@playwright/test";

/**
 * The editor renders two preview surfaces: `#preview-iframe` (the bottom
 * preview pane) and `#preview-pinned-iframe` (a pinned/floating variant).
 * Using a comma selector would match the pinned one first in DOM order and
 * see an empty body forever — so we always prefer the bottom preview and
 * only fall back to pinned if it isn't in the DOM.
 */
function findPreviewIframe(doc: Document): HTMLIFrameElement | null {
  return (doc.querySelector("#preview-iframe") ??
    doc.querySelector("#preview-pinned-iframe")) as HTMLIFrameElement | null;
}

export class PreviewFrame {
  constructor(
    readonly page: Page,
    readonly editorFrame: FrameLocator
  ) {}

  async open(timeoutMs = 15_000): Promise<void> {
    await this.editorFrame.locator("#head-bottom-preview").click();
    await this.page.waitForFunction(
      () => {
        const ed = document.querySelector("#exe-editor") as HTMLIFrameElement | null;
        const doc = ed?.contentDocument;
        if (!doc) return false;
        const iframe =
          (doc.querySelector("#preview-iframe") as HTMLIFrameElement | null) ??
          (doc.querySelector("#preview-pinned-iframe") as HTMLIFrameElement | null);
        if (!iframe) return false;
        const inner = iframe.contentDocument;
        if (!inner) return false;
        return inner.readyState === "complete" && (inner.body?.innerHTML.length ?? 0) > 100;
      },
      undefined,
      { timeout: timeoutMs, polling: 250 }
    );
  }

  async bodyLength(): Promise<number> {
    return await this.page.evaluate(() => {
      const ed = document.querySelector("#exe-editor") as HTMLIFrameElement | null;
      const doc = ed?.contentDocument;
      if (!doc) return 0;
      const iframe =
        (doc.querySelector("#preview-iframe") as HTMLIFrameElement | null) ??
        (doc.querySelector("#preview-pinned-iframe") as HTMLIFrameElement | null);
      return iframe?.contentDocument?.body?.innerHTML.length ?? 0;
    });
  }

  async hasInPreview(selector: string): Promise<boolean> {
    return await this.page.evaluate((sel) => {
      const ed = document.querySelector("#exe-editor") as HTMLIFrameElement | null;
      const doc = ed?.contentDocument;
      if (!doc) return false;
      const iframe =
        (doc.querySelector("#preview-iframe") as HTMLIFrameElement | null) ??
        (doc.querySelector("#preview-pinned-iframe") as HTMLIFrameElement | null);
      return !!iframe?.contentDocument?.querySelector(sel);
    }, selector);
  }

  /**
   * Full text content of the preview body, including content hidden inside
   * collapsed `<details>` and other non-visible nodes — we use `textContent`
   * (not `innerText`) on purpose so the assertion catches conversion
   * regressions even when the iDevice's renderer keeps the text collapsed
   * until the learner interacts with it.
   */
  async text(): Promise<string> {
    return await this.page.evaluate(() => {
      const ed = document.querySelector("#exe-editor") as HTMLIFrameElement | null;
      const doc = ed?.contentDocument;
      if (!doc) return "";
      const iframe =
        (doc.querySelector("#preview-iframe") as HTMLIFrameElement | null) ??
        (doc.querySelector("#preview-pinned-iframe") as HTMLIFrameElement | null);
      return iframe?.contentDocument?.body?.textContent ?? "";
    });
  }
}

void findPreviewIframe;
