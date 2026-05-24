import { runIdeviceFlow } from "../idevices/base";
import { unsupported } from "../idevices/unsupported";
import { test } from "../playwright.fixtures";

test("unsupported iDevice: placeholder opens, edits, saves and previews", async ({
  harness,
  editor
}) => {
  await runIdeviceFlow(harness, editor, unsupported);
});
