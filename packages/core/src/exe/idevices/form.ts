import type { ElpxIdevice } from "../model.ts";
import { newIdeviceId } from "../ids.ts";

export type FormInput = {
  pageId: string;
  blockId: string;
  order: number;
  prompt: string;
  /** raw HTML with `*answer*` markers, as used by H5P.Blanks */
  questionsHtml: string;
  title?: string;
};

export function buildFormIdevice(input: FormInput): ElpxIdevice {
  const html = [
    `<div class="h5p2elpx-question h5p2elpx-form">`,
    `  <p class="prompt">${input.prompt}</p>`,
    `  <div class="questions">${input.questionsHtml}</div>`,
    `</div>`
  ].join("\n");
  return {
    id: newIdeviceId(),
    pageId: input.pageId,
    blockId: input.blockId,
    typeName: "form",
    title: input.title ?? "Fill in the blanks",
    htmlView: html,
    jsonProperties: {
      prompt: input.prompt,
      questions: input.questionsHtml
    },
    order: input.order,
    visibility: true
  };
}
