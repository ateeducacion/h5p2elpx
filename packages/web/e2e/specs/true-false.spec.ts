import { runIdeviceFlow } from "../idevices/base";
import { trueFalse } from "../idevices/true-false";
import { test } from "../playwright.fixtures";

test("true-false iDevice: open → edit → save → preview", async ({ harness, editor }) => {
  await runIdeviceFlow(harness, editor, trueFalse);
});
