import { runIdeviceFlow } from "../idevices/base";
import { wordSearch } from "../idevices/word-search";
import { test } from "../playwright.fixtures";

test("word-search iDevice: open → edit → save → preview", async ({ harness, editor }) => {
  await runIdeviceFlow(harness, editor, wordSearch);
});
