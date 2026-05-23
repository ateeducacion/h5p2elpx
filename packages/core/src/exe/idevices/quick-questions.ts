import type { ElpxIdevice } from "../model.ts";
import { newIdeviceId } from "../ids.ts";
import { escapeHtml } from "../../utils/html.ts";

export type QuickQuestionAnswer = {
  text: string;
  correct?: boolean;
  feedback?: string;
};

export type QuickQuestionsInput = {
  pageId: string;
  blockId: string;
  order: number;
  prompt: string;
  answers: QuickQuestionAnswer[];
  feedback?: string;
  title?: string;
};

export function buildQuickQuestionsIdevice(input: QuickQuestionsInput): ElpxIdevice {
  const html = [
    `<div class="h5p2elpx-question h5p2elpx-quickquestion">`,
    `  <p class="prompt">${input.prompt}</p>`,
    `  <ul>`,
    ...input.answers.map(
      (a) => `    <li${a.correct ? ' class="correct"' : ""}>${escapeHtml(a.text)}</li>`
    ),
    `  </ul>`,
    input.feedback ? `  <p class="feedback">${escapeHtml(input.feedback)}</p>` : "",
    `</div>`
  ]
    .filter(Boolean)
    .join("\n");
  return {
    id: newIdeviceId(),
    pageId: input.pageId,
    blockId: input.blockId,
    typeName: "quick-questions",
    title: input.title ?? "Quick Question",
    htmlView: html,
    jsonProperties: {
      prompt: input.prompt,
      answers: input.answers,
      feedback: input.feedback ?? ""
    },
    order: input.order,
    visibility: true
  };
}
