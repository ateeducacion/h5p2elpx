import type { FrameLocator, Page } from "@playwright/test";

export type NavNode = {
  nodeId: string;
  title: string;
  level: number;
};

export class NavigationPanel {
  constructor(
    readonly page: Page,
    readonly frame: FrameLocator
  ) {}

  /** Enumerate all nav-node entries currently rendered in the TOC. */
  async listNodes(): Promise<NavNode[]> {
    return await this.page.evaluate(() => {
      const iframe = document.querySelector("#exe-editor") as HTMLIFrameElement | null;
      const doc = iframe?.contentDocument;
      if (!doc) return [];
      const elements = Array.from(
        doc.querySelectorAll('#nav_list [data-testid="nav-node"]')
      ) as HTMLElement[];
      return elements.map((el) => {
        const nodeId = el.getAttribute("data-node-id") ?? "";
        const levelMatch = el.className.match(/level(\d+)/);
        const level = levelMatch ? Number(levelMatch[1]) : 0;
        const textEl = el.querySelector(".node-text-span") as HTMLElement | null;
        const title = (textEl?.textContent ?? "").trim();
        return { nodeId, title, level };
      });
    });
  }

  /**
   * Ensure the given nav node is selected and its content is rendered.
   * If the node is already aria-selected we just wait for content; otherwise
   * we synthesize a click via the DOM (bypassing visibility constraints from
   * the collapsed-by-default left rail).
   */
  async selectByNodeId(nodeId: string): Promise<void> {
    await this.page.waitForFunction(
      (id) => {
        const iframe = document.querySelector("#exe-editor") as HTMLIFrameElement | null;
        const doc = iframe?.contentDocument;
        if (!doc) return false;
        const node = doc.querySelector(
          `#nav_list [data-testid="nav-node"][data-node-id="${id}"]`
        ) as HTMLElement | null;
        if (!node) return false;
        const selected = node.getAttribute("aria-selected") === "true";
        if (!selected) {
          const trigger =
            (node.querySelector('[data-testid="nav-node-text"]') as HTMLElement | null) ?? node;
          trigger.click();
          return false;
        }
        const nc = doc.querySelector("#node-content") as HTMLElement | null;
        return !!nc && nc.innerHTML.length > 100;
      },
      nodeId,
      { timeout: 6_000, polling: 250 }
    );
  }
}
