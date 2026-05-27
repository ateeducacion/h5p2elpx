import type { ElpxIdevice } from "../model.ts";
import { newIdeviceId } from "../ids.ts";

export type CaseStudyActivity = {
  /** Rich-HTML prompt the learner reads/answers. */
  activity: string;
  /** Optional collapsible feedback (typically the teacher answer key). */
  feedback?: string;
  /** Button label that toggles the feedback panel. */
  buttonCaption?: string;
};

export type CaseStudyIdeviceInput = {
  pageId: string;
  blockId: string;
  order: number;
  title?: string;
  /** Narrative / scenario shown above the activity list. */
  history: string;
  activities: CaseStudyActivity[];
};

/**
 * Mirrors the `casestudy` iDevice shape documented in
 * `doc/elpx-format/idevices/snippets.md` (Standard JSON pattern). eXe's
 * editor reconstructs the rendered HTML from `jsonProperties` on import,
 * so we only need to emit a minimal-but-valid `<htmlView>` that the eXe
 * runtime can re-render on first open.
 */
export function buildCaseStudyIdevice(input: CaseStudyIdeviceInput): ElpxIdevice {
  const id = newIdeviceId();
  const history = input.history ?? "";
  const activities = input.activities.length
    ? input.activities.map((a) => ({
        activity: a.activity ?? "",
        feedback: a.feedback ?? "",
        buttonCaption: a.buttonCaption ?? "Mostrar retroalimentación"
      }))
    : [{ activity: "", feedback: "", buttonCaption: "Mostrar retroalimentación" }];

  const activitiesHtml = activities
    .map(
      (a) =>
        `        <div class="CSP-Activity"><div class="CSP-Activity-Body">${a.activity}</div>${
          a.feedback
            ? `<button class="CSP-Activity-Feedback-Btn" type="button">${escapeHtml(a.buttonCaption!)}</button><div class="CSP-Activity-Feedback" hidden>${a.feedback}</div>`
            : ""
        }</div>`
    )
    .join("\n");
  const htmlView = [
    `<div class="caseStudyContent">`,
    `  <div class="CSP-Info mb-3"></div>`,
    `  <div class="CSP-History mb-3">${history}</div>`,
    `  <div class="CSP-Activities mb-3">`,
    activitiesHtml,
    `  </div>`,
    `</div>`
  ].join("\n");

  return {
    id,
    pageId: input.pageId,
    blockId: input.blockId,
    typeName: "casestudy",
    title: input.title ?? "",
    htmlView,
    jsonProperties: {
      id,
      typeGame: "Case study",
      history,
      textInfoDurationInput: "",
      textInfoDurationTextInput: "Duración",
      textInfoParticipantsInput: "",
      textInfoParticipantsTextInput: "Agrupamiento",
      activities
    },
    order: input.order,
    visibility: true
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
