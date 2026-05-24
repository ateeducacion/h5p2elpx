import type { Page } from "@playwright/test";

const DEFAULT_ALLOWLIST: Array<string | RegExp> = [
  "favicon",
  "Failed to load resource: the server responded with a status of 404",
  // The pinned eXeLearning bundle logs benign init noise on first paint.
  /Yjs.*deprecated/i,
  /WebSocket connection.*failed/i
];

export type ConsoleCollector = {
  errors: () => string[];
  severe: (extraAllow?: Array<string | RegExp>) => string[];
  reset: () => void;
};

export function collectConsole(
  page: Page,
  allowlist: Array<string | RegExp> = []
): ConsoleCollector {
  const acc: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") acc.push(m.text());
  });
  page.on("pageerror", (err) => acc.push(`pageerror: ${err.message}`));

  return {
    errors: () => [...acc],
    severe(extraAllow = []) {
      const all = [...DEFAULT_ALLOWLIST, ...allowlist, ...extraAllow];
      return acc.filter(
        (text) => !all.some((p) => (typeof p === "string" ? text.includes(p) : p.test(text)))
      );
    },
    reset() {
      acc.length = 0;
    }
  };
}
