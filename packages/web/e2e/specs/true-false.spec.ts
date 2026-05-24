import { runIdeviceFlow } from "../idevices/base";
import { trueFalse } from "../idevices/true-false";
import { expect, test } from "../playwright.fixtures";

test("true-false iDevice: open → edit → save → preview", async ({ harness, editor, page }) => {
  await runIdeviceFlow(harness, editor, trueFalse);

  // The H5P source attaches an image (Oslo Opera House) to the question.
  // The trueorfalse iDevice supports it by embedding the <img> inside the
  // question HTML, so the runtime injects it after the user clicks
  // "Click here to start". Drive that flow and assert the image renders.
  const started = await page.evaluate(async () => {
    const ed = document.querySelector("#exe-editor") as HTMLIFrameElement | null;
    const pv = ed?.contentDocument?.querySelector("#preview-iframe") as HTMLIFrameElement | null;
    const pvDoc = pv?.contentDocument;
    if (!pvDoc) return false;
    const startBtn = Array.from(pvDoc.querySelectorAll("button, .btn, a")).find((el) =>
      /click here to start|empezar|start/i.test((el as HTMLElement).textContent ?? "")
    ) as HTMLElement | undefined;
    if (!startBtn) return false;
    startBtn.click();
    await new Promise((r) => setTimeout(r, 1000));
    return true;
  });
  expect(started, "true-false start button not found in preview").toBe(true);

  const img = await page.evaluate(() => {
    const ed = document.querySelector("#exe-editor") as HTMLIFrameElement | null;
    const pv = ed?.contentDocument?.querySelector("#preview-iframe") as HTMLIFrameElement | null;
    const pvDoc = pv?.contentDocument;
    if (!pvDoc) return null;
    const found = Array.from(pvDoc.querySelectorAll("img")).find(
      (i) => i.src.includes("/content/resources/") && i.naturalWidth > 100
    ) as HTMLImageElement | undefined;
    return found ? { src: found.src, alt: found.alt, w: found.naturalWidth } : null;
  });
  expect(img, "embedded question image did not render in preview").not.toBeNull();
  expect(img?.alt).toBe("The Oslo Opera House");
});
