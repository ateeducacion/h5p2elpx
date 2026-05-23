import type { ElpxIdevice } from "../model.ts";
import { newIdeviceId } from "../ids.ts";

export type TextIdeviceInput = {
  pageId: string;
  blockId: string;
  order: number;
  title?: string;
  html: string;
};

/**
 * Mirrors the `text` iDevice shape documented in
 * `doc/elpx-format/idevices/snippets.md` (Pattern 1, Standard JSON):
 *
 *   htmlView:
 *     <div class="exe-text-template">
 *       <div class="textIdeviceContent">
 *         <div class="exe-text-activity">
 *           <div><div class="exe-text">{html}</div></div>
 *         </div>
 *       </div>
 *     </div>
 *
 *   jsonProperties:
 *     { ideviceId, textInfoDurationInput, textInfoDurationTextInput,
 *       textInfoParticipantsInput, textInfoParticipantsTextInput,
 *       textTextarea (= raw html), textFeedbackInput, textFeedbackTextarea }
 */
export function buildTextIdevice(input: TextIdeviceInput): ElpxIdevice {
  const id = newIdeviceId();
  const html = input.html ?? "";
  const htmlView = [
    `<div class="exe-text-template">`,
    `  <div class="textIdeviceContent">`,
    `    <div class="exe-text-activity">`,
    `      <div><div class="exe-text">${html}</div></div>`,
    `    </div>`,
    `  </div>`,
    `</div>`
  ].join("\n");
  return {
    id,
    pageId: input.pageId,
    blockId: input.blockId,
    typeName: "text",
    title: input.title ?? "Texto",
    htmlView,
    jsonProperties: {
      ideviceId: id,
      textInfoDurationInput: "",
      textInfoDurationTextInput: "Duración",
      textInfoParticipantsInput: "",
      textInfoParticipantsTextInput: "Agrupamiento",
      textTextarea: html,
      textFeedbackInput: "Mostrar retroalimentación",
      textFeedbackTextarea: ""
    },
    order: input.order,
    visibility: true
  };
}
