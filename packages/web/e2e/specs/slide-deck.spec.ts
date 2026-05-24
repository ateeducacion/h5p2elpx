import { runIdeviceFlow } from "../idevices/base";
import { slideDeck } from "../idevices/slide-deck";
import { test } from "../playwright.fixtures";

test("slide-deck iDevice: open → edit → save → preview", async ({ harness, editor }) => {
  test.setTimeout(90_000);
  await runIdeviceFlow(harness, editor, slideDeck);
});
