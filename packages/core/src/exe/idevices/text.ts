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
 * eXeLearning's `text` iDevice expects:
 *   - htmlView wrapped in `<div class="exe-text-template">…</div>`
 *   - jsonProperties with the editable HTML in `textTextarea` (plus the
 *     boilerplate fields eXe shows in the form: duration, participants,
 *     feedback).
 */
export function buildTextIdevice(input: TextIdeviceInput): ElpxIdevice {
  const id = newIdeviceId();
  const htmlView = `<div class="exe-text-template">\n    ${input.html}\n</div>`;
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
      textTextarea: input.html,
      textFeedbackInput: "Mostrar retroalimentación",
      textFeedbackTextarea: ""
    },
    order: input.order,
    visibility: true
  };
}
