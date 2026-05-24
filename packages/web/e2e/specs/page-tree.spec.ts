import { runIdeviceFlow } from "../idevices/base";
import { pageTree } from "../idevices/page-tree";
import { test } from "../playwright.fixtures";

test("page-tree iDevice: open → edit → save → preview", async ({ harness, editor }) => {
  test.setTimeout(90_000);
  await runIdeviceFlow(harness, editor, pageTree);
});
