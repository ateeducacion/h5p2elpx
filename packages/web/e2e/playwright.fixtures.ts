import { test as base } from "@playwright/test";
import { collectConsole, type ConsoleCollector } from "./helpers/console";
import { editorAvailable } from "./helpers/editor-availability";
import { EditorFrame } from "./pages/EditorFrame";
import { HarnessPage } from "./pages/HarnessPage";

type Fixtures = {
  harness: HarnessPage;
  editor: EditorFrame;
  console: ConsoleCollector;
};

export const test = base.extend<Fixtures>({
  console: async ({ page }, use) => {
    const collector = collectConsole(page);
    await use(collector);
  },
  harness: async ({ page, console: _c }, use) => {
    if (!process.env.EXELEARNING_EDITOR_URL && !(await editorAvailable())) {
      test.skip(
        true,
        'eXeLearning static editor not vendored. Run "bun run e2e:fetch-editor" or set EXELEARNING_EDITOR_URL.'
      );
    }
    await use(new HarnessPage(page));
  },
  editor: async ({ page }, use) => {
    await use(new EditorFrame(page));
  }
});

export { expect } from "@playwright/test";
