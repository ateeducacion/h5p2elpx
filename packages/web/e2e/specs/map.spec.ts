import { runIdeviceFlow } from "../idevices/base";
import { map } from "../idevices/map";
import { test } from "../playwright.fixtures";

test("map iDevice: open → edit → save → preview", async ({ harness, editor }) => {
  await runIdeviceFlow(harness, editor, map);
});
