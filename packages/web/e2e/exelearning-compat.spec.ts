import { expect, test } from "@playwright/test";
import { buildElpxFromH5p, editorAvailable } from "./fixtures";

declare global {
  interface Window {
    __exeMessages: Array<{ type: string; [key: string]: unknown }>;
    openElpx: (
      bytes: number[] | ArrayBuffer,
      filename: string
    ) => Promise<{
      open: { type: string; [key: string]: unknown };
      document: { type: string; pageCount?: number } | null;
    }>;
    getProjectInfo: () => Promise<{
      type: string;
      projectId?: string;
      pageCount?: number;
    }>;
    getState: () => Promise<{ type: string; hasProject?: boolean; pageCount?: number }>;
    requestExport: (format: string) => Promise<{
      type: string;
      data?: { bytes?: ArrayBuffer | number[]; size?: number };
    }>;
  }
}

const FIXTURE = process.env.E2E_H5P_FIXTURE ?? "true-false-question.h5p";
const EDITOR_URL = process.env.EXELEARNING_EDITOR_URL ?? "/exe/";

let elpx: { bytes: Uint8Array; filename: string };

test.beforeAll(async () => {
  if (!process.env.EXELEARNING_EDITOR_URL && !(await editorAvailable())) {
    test.skip(
      true,
      `eXeLearning static editor not vendored. Run "bun run e2e:fetch-editor" or set EXELEARNING_EDITOR_URL.`
    );
  }
  const built = await buildElpxFromH5p(FIXTURE);
  elpx = { bytes: built.bytes, filename: built.filename };
});

test("generated .elpx opens in the eXeLearning static editor", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const harnessPath = `/harness/exe-editor-harness.html?editorUrl=${encodeURIComponent(EDITOR_URL)}`;
  await page.goto(harnessPath);

  const bytesArray = Array.from(elpx.bytes);
  const filename = elpx.filename;

  const result = await page.evaluate(
    async ({ bytesArray, filename }) => await window.openElpx(bytesArray, filename),
    { bytesArray, filename }
  );

  expect(result.open.type, JSON.stringify(result.open)).toBe("OPEN_FILE_SUCCESS");
  expect(result.document?.type).toBe("DOCUMENT_LOADED");

  const projectInfo = await page.evaluate(() => window.getProjectInfo());
  expect(projectInfo.type).toBe("PROJECT_INFO");
  expect(projectInfo.projectId).toBeTruthy();
  expect(projectInfo.pageCount ?? 0).toBeGreaterThanOrEqual(1);

  const openErrors = await page.evaluate(() =>
    window.__exeMessages.filter((m) => m.type === "OPEN_FILE_ERROR")
  );
  expect(openErrors).toEqual([]);

  const severe = consoleErrors.filter(
    (text) =>
      !text.includes("favicon") &&
      !text.includes("Failed to load resource: the server responded with a status of 404")
  );
  expect(severe, severe.join("\n")).toEqual([]);
});
