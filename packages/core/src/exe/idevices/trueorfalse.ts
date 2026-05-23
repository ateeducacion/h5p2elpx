import type { ElpxIdevice } from "../model.ts";
import { newIdeviceId } from "../ids.ts";

export type TrueOrFalseInput = {
  pageId: string;
  blockId: string;
  order: number;
  prompt: string;
  answer: boolean;
  feedback?: string;
  title?: string;
};

export function buildTrueOrFalseIdevice(input: TrueOrFalseInput): ElpxIdevice {
  const html = [
    `<div class="h5p2elpx-question h5p2elpx-truefalse">`,
    `  <p class="prompt">${input.prompt}</p>`,
    `  <ul>`,
    `    <li${input.answer ? ' class="correct"' : ""}>True</li>`,
    `    <li${!input.answer ? ' class="correct"' : ""}>False</li>`,
    `  </ul>`,
    input.feedback ? `  <p class="feedback">${input.feedback}</p>` : "",
    `</div>`
  ]
    .filter(Boolean)
    .join("\n");
  return {
    id: newIdeviceId(),
    pageId: input.pageId,
    blockId: input.blockId,
    typeName: "trueorfalse",
    title: input.title ?? "True or False",
    htmlView: html,
    jsonProperties: {
      prompt: input.prompt,
      answer: input.answer,
      feedback: input.feedback ?? ""
    },
    order: input.order,
    visibility: true
  };
}
