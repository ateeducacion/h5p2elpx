import { beforeAfter } from "../idevices/before-after";
import { runIdeviceFlow } from "../idevices/base";
import { test } from "../playwright.fixtures";

test("before-after iDevice: open → edit → save → preview", async ({ harness, editor }) => {
  await runIdeviceFlow(harness, editor, beforeAfter);
});
