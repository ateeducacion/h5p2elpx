import { runIdeviceFlow } from "../idevices/base";
import { crossword } from "../idevices/crossword";
import { test } from "../playwright.fixtures";

test("crossword iDevice: open → edit → save → preview", async ({ harness, editor }) => {
  await runIdeviceFlow(harness, editor, crossword);
});
