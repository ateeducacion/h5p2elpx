import { expect } from "@playwright/test";
import type { EditorFrame } from "../pages/EditorFrame";
import type { HarnessPage } from "../pages/HarnessPage";
import type { IdeviceDescriptor } from "./types";

/**
 * Reusable flow for an iDevice kind:
 *  1. Open the .elpx in the editor (postMessage harness).
 *  2. Wait for the editor to be ready.
 *  3. For each TOC page (capped by descriptor.maxPagesToWalk):
 *     - Select the page.
 *     - Assert #node-content rendered.
 *     - Enter advanced mode.
 *     - Click save; assert save button is not "unsaved".
 *  4. After walking the pages, open Preview at the currently selected page
 *     and assert the preview body is non-empty and matches descriptor hints.
 */
export async function runIdeviceFlow(
  harness: HarnessPage,
  editor: EditorFrame,
  descriptor: IdeviceDescriptor
): Promise<void> {
  const info = await harness.openH5p(descriptor.fixture);
  expect(info.pageCount, `${descriptor.fixture} pageCount`).toBeGreaterThanOrEqual(
    descriptor.minPageCount
  );

  await editor.waitForReady();

  const nodes = await editor.nav.listNodes();
  expect(nodes.length, `${descriptor.fixture} nav nodes`).toBeGreaterThanOrEqual(1);

  const walkLimit = descriptor.maxPagesToWalk ?? nodes.length;
  const toWalk = nodes.slice(0, walkLimit);

  for (const node of toWalk) {
    await editor.nav.selectByNodeId(node.nodeId);
    const contentLen = await editor.nodeContentLength();
    expect(contentLen, `${descriptor.fixture}/${node.nodeId} #node-content`).toBeGreaterThan(200);
    await editor.enterAdvancedMode();
    await editor.save();
  }

  await editor.preview.open();
  const bodyLen = await editor.preview.bodyLength();
  expect(bodyLen, `${descriptor.fixture} preview body length`).toBeGreaterThan(100);

  if (descriptor.previewMustContain) {
    const found = await editor.preview.hasInPreview(descriptor.previewMustContain);
    expect(
      found,
      `${descriptor.fixture} preview must contain selector ${descriptor.previewMustContain}`
    ).toBe(true);
  }
  if (descriptor.previewMustIncludeText) {
    // The runtime injects iDevice content asynchronously into the preview
    // (e.g. trueorfalse hydrates its question card after a tick), so poll
    // briefly instead of asserting on the first frame.
    const needle = descriptor.previewMustIncludeText;
    let lastText = "";
    let found = false;
    for (let i = 0; i < 12; i++) {
      lastText = await editor.preview.text();
      if (lastText.includes(needle)) {
        found = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    expect(
      found,
      `${descriptor.fixture} preview must include "${needle}" (last text: ${lastText.slice(0, 200)})`
    ).toBe(true);
  }
}
