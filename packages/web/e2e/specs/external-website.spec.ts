import { runIdeviceFlow } from "../idevices/base";
import { externalWebsite } from "../idevices/external-website";
import { test } from "../playwright.fixtures";

test("external-website iDevice: open → edit → save → preview", async ({ harness, editor }) => {
  await runIdeviceFlow(harness, editor, externalWebsite);
});
