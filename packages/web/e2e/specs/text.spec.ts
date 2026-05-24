import { runIdeviceFlow } from "../idevices/base";
import { text } from "../idevices/text";
import { test } from "../playwright.fixtures";

test("text iDevice: open → edit → save → preview", async ({ harness, editor }) => {
  await runIdeviceFlow(harness, editor, text);
});
