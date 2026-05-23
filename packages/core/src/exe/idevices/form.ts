import type { ElpxIdevice } from "../model.ts";
import { newIdeviceId } from "../ids.ts";

/** Selection question — single or multiple correct answers (radio / checkbox). */
export type SelectionQuestion = {
  activityType: "selection";
  /** "single" → radio (one correct), "multiple" → checkbox (>=1 correct) */
  selectionType: "single" | "multiple";
  /** HTML prompt */
  baseText: string;
  /** Per-option `[isCorrect, label]` or `[isCorrect, label, feedback]` */
  answers: Array<[boolean, string] | [boolean, string, string]>;
  hint?: string;
};

/** Fill-in-blanks question — `baseText` has `<u>answer</u>` markers. */
export type FillQuestion = {
  activityType: "fill";
  baseText: string;
  answers: string[];
};

/** True/false single-row question (legacy form variant — not the game). */
export type TrueFalseFormQuestion = {
  activityType: "true-false";
  baseText: string;
  /** "1" for True, "0" for False */
  answer: "0" | "1";
};

export type FormQuestion = SelectionQuestion | FillQuestion | TrueFalseFormQuestion;

export type FormInput = {
  pageId: string;
  blockId: string;
  order: number;
  questions: FormQuestion[];
  instructions?: string;
  feedbackAfter?: string;
  ignoreCaps?: boolean;
  strictMarking?: boolean;
  instantMarking?: boolean;
  title?: string;
};

/**
 * Mirrors `MultichoiceHandler.extractProperties` and
 * `FillHandler.extractProperties` in the eXeLearning v4 repo
 * (src/shared/import/legacy-handlers/{Multichoice,Fill}Handler.ts) and
 * the schema in `doc/elpx-format/idevices/snippets.md` (Pattern 1).
 *
 * One writer covers all three activity types — eXeLearning's `form`
 * iDevice picks the renderer per `activityType` field in each question.
 */
export function buildFormIdevice(input: FormInput): ElpxIdevice {
  const id = newIdeviceId();
  const jsonProperties: Record<string, unknown> = {
    ideviceId: id,
    id,
    evaluation: false,
    evaluationID: "",
    repeatActivity: true,
    isScorm: 0,
    textButtonScorm: "Save score",
    weighted: 100,
    msgs: {
      msgCheck: "Check",
      msgReset: "Reset",
      msgShowAnswers: "Show answers"
    },
    questionsRandom: false,
    percentageQuestions: "100",
    time: "0",
    questionsData: input.questions,
    passRate: 50,
    addBtnAnswers: true,
    eXeIdeviceTextAfter: input.feedbackAfter ?? ""
  };
  if (input.instructions?.trim()) {
    jsonProperties.eXeFormInstructions = input.instructions;
  }
  if (input.ignoreCaps !== undefined) jsonProperties.ignoreCaps = input.ignoreCaps;
  if (input.strictMarking !== undefined) jsonProperties.strictMarking = input.strictMarking;
  if (input.instantMarking !== undefined) jsonProperties.instantMarking = input.instantMarking;

  const htmlView = [
    `<div class="exe-form-template" id="${id}-form">`,
    input.instructions ? `  <div class="exe-form-instructions">${input.instructions}</div>` : "",
    `  <div class="exe-form-questions" data-questions="${input.questions.length}"></div>`,
    `</div>`
  ]
    .filter(Boolean)
    .join("\n");

  return {
    id,
    pageId: input.pageId,
    blockId: input.blockId,
    typeName: "form",
    title: input.title ?? "Form",
    htmlView,
    jsonProperties,
    order: input.order,
    visibility: true
  };
}

/**
 * Helper: convert an H5P.Blanks-style HTML with `*answer*` markers into
 * the `<u>answer</u>` markers eXe's form/fill renderer expects, plus an
 * `answers` array. The first `/` inside `*…*` is treated as the
 * accept-alternatives separator (`answer/alt1/alt2`).
 */
export function blanksToFill(blanksHtml: string): FillQuestion {
  const answers: string[] = [];
  const baseText = blanksHtml.replace(/\*([^*]+)\*/g, (_m, inside: string) => {
    const primary = inside.split("/")[0] ?? "";
    answers.push(primary.trim());
    return `<u>${primary.trim()}</u>`;
  });
  return { activityType: "fill", baseText, answers };
}
