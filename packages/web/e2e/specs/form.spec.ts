import { runIdeviceFlow } from "../idevices/base";
import { form } from "../idevices/form";
import { test } from "../playwright.fixtures";

test("form iDevice: open → edit → save → preview", async ({ harness, editor }) => {
  await runIdeviceFlow(harness, editor, form);
});
