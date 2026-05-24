import { runIdeviceFlow } from "../idevices/base";
import { flipcards } from "../idevices/flipcards";
import { test } from "../playwright.fixtures";

test("flipcards iDevice: open → edit → save → preview", async ({ harness, editor }) => {
  await runIdeviceFlow(harness, editor, flipcards);
});
