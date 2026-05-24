import type { ElpxIdevice } from "../model.ts";
import { newIdeviceId } from "../ids.ts";
import { TRUEORFALSE_MSGS_EN } from "./i18n/trueorfalse-en.ts";

export type TrueOrFalseQuestion = {
  /** HTML statement shown to the learner */
  question: string;
  /** Optional HTML feedback shown after the answer is revealed */
  feedback?: string;
  /** Optional HTML hint */
  suggestion?: string;
  /** 1 for True, 0 for False */
  solution: 0 | 1;
};

export type TrueOrFalseInput = {
  pageId: string;
  blockId: string;
  order: number;
  /** Optional intro shown above the game */
  instructions?: string;
  questions: TrueOrFalseQuestion[];
  title?: string;
};

/**
 * Mirrors `TrueFalseHandler.extractProperties` in the eXeLearning v4 repo
 * (src/shared/import/legacy-handlers/TrueFalseHandler.ts). The htmlView
 * is the game scaffold; the runtime reads `questionsGame` from
 * jsonProperties to render each card.
 */
export function buildTrueOrFalseIdevice(input: TrueOrFalseInput): ElpxIdevice {
  const id = newIdeviceId();
  const questionsGame = input.questions.map((question) => ({
    question: question.question ?? "",
    feedback: question.feedback ?? "",
    suggestion: question.suggestion ?? "",
    solution: question.solution
  }));
  const jsonProperties = {
    id,
    typeGame: "TrueOrFalse",
    eXeGameInstructions: input.instructions ?? "",
    eXeIdeviceTextAfter: "",
    msgs: { ...TRUEORFALSE_MSGS_EN },
    questionsRandom: false,
    percentageQuestions: 100,
    isTest: false,
    time: 0,
    questionsGame,
    isScorm: 0,
    textButtonScorm: "Save score",
    repeatActivity: true,
    weighted: 100,
    evaluation: false,
    evaluationID: "",
    showSlider: false,
    ideviceId: id
  };
  const htmlView = [
    `<div class="trueorfalse-Container" data-game="trueorfalse" id="${id}-container">`,
    input.instructions ? `  <div class="trueorfalse-Instructions">${input.instructions}</div>` : "",
    `  <div class="trueorfalse-Game" id="${id}-game"></div>`,
    `</div>`
  ]
    .filter(Boolean)
    .join("\n");
  return {
    id,
    pageId: input.pageId,
    blockId: input.blockId,
    typeName: "trueorfalse",
    title: input.title ?? TRUEORFALSE_MSGS_EN.msgTypeGame,
    htmlView,
    jsonProperties,
    order: input.order,
    visibility: true
  };
}
