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
 * Mirrors the eXeLearning `interactive-video` iDevice. Modern eXe
 * (idevices/base/interactive-video/edition/interactive-video.js, line ~818)
 * writes the slides payload inside a `<script type="application/json">`.
 * Inside such a script the HTML parser does not interpret tags, so JSON
 * values containing literal `<p>...</p>` (every H5P question) survive
 * intact when the runtime reads `contentElement.textContent`. The older
 * `<div>` form only worked when slide text was pure plain text.
 *
 *   <div class="exe-interactive-video">
 *     <p id="exe-interactive-video-file" class="js-hidden">
 *       <a href="${src}">${src}</a>
 *     </p>
 *     <script id="exe-interactive-video-contents" type="application/json">
 *       { slides, title, description, i18n }
 *     </script>
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
  const contentsJson = JSON.stringify(contents).replace(/<\/script/gi, "<\\/script");
  const safeHref = escapeAttr(input.src);
  const safeLabel = escapeHtml(input.src);
  const htmlView =
    `<div class="exe-interactive-video">` +
    `<p id="exe-interactive-video-file" class="js-hidden">` +
    `<a href="${safeHref}">${safeLabel}</a>` +
    `</p>` +
    `<script id="exe-interactive-video-contents" type="application/json">${contentsJson}</script>` +
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
