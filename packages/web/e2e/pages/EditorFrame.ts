import type { FrameLocator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { NavigationPanel } from "./NavigationPanel";
import { PreviewFrame } from "./PreviewFrame";

/**
 * POM for the eXeLearning editor running inside the harness iframe.
 * All selectors live inside `page.frameLocator('#exe-editor')`.
 */
export class EditorFrame {
  readonly frame: FrameLocator;
  readonly nav: NavigationPanel;
  readonly preview: PreviewFrame;

  constructor(readonly page: Page) {
    this.frame = page.frameLocator("#exe-editor");
    this.nav = new NavigationPanel(page, this.frame);
    this.preview = new PreviewFrame(page, this.frame);
  }

  /** Wait until the editor app shell is interactable. */
  async waitForReady(timeoutMs = 8_000): Promise<void> {
    await this.frame.locator("#nav_list").first().waitFor({ timeout: timeoutMs });
    await this.frame.locator("#head-top-save-button").waitFor({ timeout: timeoutMs });
    await this.frame.locator("#head-bottom-preview").waitFor({ timeout: timeoutMs });
  }

  /** Click the global save button and confirm it lands in a non-error state. */
  async save(): Promise<void> {
    const btn = this.frame.locator("#head-top-save-button");
    await btn.click();
    // After save the button must not be in "unsaved" state (red dot).
    await expect(btn).not.toHaveClass(/\bunsaved\b/, { timeout: 5_000 });
  }

  /**
   * Toggle the editor into advanced/edit mode. eXeLearning exposes this via
   * a body `mode` attribute on its app document.
   */
  async enterAdvancedMode(): Promise<void> {
    await this.page.evaluate(() => {
      const iframe = document.querySelector("#exe-editor") as HTMLIFrameElement | null;
      const doc = iframe?.contentDocument;
      if (!doc) return;
      doc.body.setAttribute("mode", "advanced");
    });
  }

  /** Inner HTML length of #node-content for the currently selected page. */
  async nodeContentLength(): Promise<number> {
    return await this.page.evaluate(() => {
      const iframe = document.querySelector("#exe-editor") as HTMLIFrameElement | null;
      const el = iframe?.contentDocument?.querySelector("#node-content") as HTMLElement | null;
      return el ? el.innerHTML.length : 0;
    });
  }

  /** True if at least one rendered iDevice article exists inside #node-content. */
  async hasIdeviceArticle(): Promise<boolean> {
    return await this.page.evaluate(() => {
      const iframe = document.querySelector("#exe-editor") as HTMLIFrameElement | null;
      const a = iframe?.contentDocument?.querySelector(
        "#node-content article.box.idevice-element-in-content, #node-content article.idevice-element-in-content"
      );
      return !!a;
    });
  }
}
