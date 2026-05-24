import { expect, test } from "../playwright.fixtures";

const FIXTURE = process.env.E2E_H5P_FIXTURE ?? "true-false-question.h5p";

test("smoke: generated .elpx opens in the eXeLearning static editor", async ({
  harness,
  editor,
  console: consoleCollector
}) => {
  const info = await harness.openH5p(FIXTURE);
  expect(info.projectId).toBeTruthy();
  expect(info.pageCount).toBeGreaterThanOrEqual(1);

  await editor.waitForReady();

  const severe = consoleCollector.severe();
  expect(severe, severe.join("\n")).toEqual([]);
});
