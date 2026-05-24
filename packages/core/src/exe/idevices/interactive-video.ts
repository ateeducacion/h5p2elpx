import type { ElpxIdevice } from "../model.ts";
import { newIdeviceId } from "../ids.ts";
import { INTERACTIVE_VIDEO_I18N_EN } from "./i18n/interactive-video-en.ts";

/** Plain text overlay shown from `startTime` until the learner closes it. */
export type IvTextSlide = {
  type: "text";
  text: string;
  startTime: number;
};

/** Single-choice question. `answers` is `[label, isCorrect ? 1 : 0]`. */
export type IvSingleChoiceSlide = {
  type: "singleChoice";
  question: string;
  answers: Array<[string, 0 | 1]>;
  startTime: number;
};

export type IvSlide = IvTextSlide | IvSingleChoiceSlide;

export type InteractiveVideoInput = {
  pageId: string;
  blockId: string;
  order: number;
  /** YouTube URL or path to an MP4/WebM/Ogv asset (already rewritten). */
  src: string;
  title?: string;
  description?: string;
  slides: IvSlide[];
};

/**
 * Mirrors the eXeLearning `interactive-video` iDevice — exact wire format
 * captured in `fixtures/elpx/sample-with-content.elpx` (`content.xml`
 * line ~1194):
 *
 *   <div class="exe-interactive-video">
 *     <p id="exe-interactive-video-file" class="js-hidden">
 *       <a href="${src}">${src}</a>
 *     </p>
 *     <div id="exe-interactive-video-contents" style="display: none">
 *       { slides, title, description, i18n }
 *     </div>
 *   </div>
 */
export function buildInteractiveVideoIdevice(input: InteractiveVideoInput): ElpxIdevice {
  const id = newIdeviceId();
  const contents = {
    slides: input.slides,
    title: input.title ?? "",
    description: input.description ?? "",
    i18n: { ...INTERACTIVE_VIDEO_I18N_EN }
  };
  const contentsJson = JSON.stringify(contents);
  const safeHref = escapeAttr(input.src);
  const safeLabel = escapeHtml(input.src);
  const htmlView =
    `<div class="exe-interactive-video">` +
    `<p id="exe-interactive-video-file" class="js-hidden">` +
    `<a href="${safeHref}">${safeLabel}</a>` +
    `</p>` +
    `<div id="exe-interactive-video-contents" style="display: none">${contentsJson}</div>` +
    `</div>`;

  return {
    id,
    pageId: input.pageId,
    blockId: input.blockId,
    typeName: "interactive-video",
    title: input.title ?? "Interactive video",
    htmlView,
    jsonProperties: {
      ideviceId: id,
      textInfoDurationInput: "",
      textInfoParticipantsInput: "",
      textInfoDurationTextInput: "",
      textInfoParticipantsTextInput: "",
      textTextarea: htmlView,
      textFeedbackInput: "",
      textFeedbackTextarea: ""
    },
    order: input.order,
    visibility: true
  };
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
