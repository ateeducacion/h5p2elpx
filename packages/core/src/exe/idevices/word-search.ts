import type { ElpxIdevice } from "../model.ts";
import { newIdeviceId } from "../ids.ts";
import { encryptGameData } from "../encrypt.ts";
import { CROSSWORD_DEFAULT_MSGS } from "./crossword-i18n.ts";

export type WordSearchInput = {
  pageId: string;
  blockId: string;
  order: number;
  words: string[];
  title?: string;
  instructions?: string;
};

/**
 * Mirrors the eXeLearning `word-search` (Sopa de letras) iDevice. Same
 * gamification storage pattern as crossword:
 *
 *  - JSON inside `<div class="sopa-DataGame js-hidden">` is XOR-encrypted
 *    with key 146 + legacy escape() — `../encrypt.ts`.
 *  - `typeGame: "Sopa"` (Spanish — runtime checks literally at
 *    `word-search.js:1460`).
 *  - Uses the standard `textTextarea` jsonProperties pattern.
 *
 * Shape derived from `validateData` (`word-search.js:879–902`) plus
 * `msgs` from `refreshTranslations`. The crossword msgs bag is a
 * superset of word-search's — reuse it.
 */
export function buildWordSearchIdevice(input: WordSearchInput): ElpxIdevice {
  const id = newIdeviceId();
  const wordsGame = input.words.map((w) => ({
    word: w,
    definition: "",
    x: 0,
    y: 0,
    author: "",
    alt: "",
    url: "",
    audio: "",
    percentageShow: null
  }));
  const gameData = {
    typeGame: "Sopa",
    instructions: input.instructions ?? "",
    showMinimize: false,
    itinerary: {
      showClue: false,
      clueGame: "",
      percentageClue: 40,
      showCodeAccess: false,
      codeAccess: "",
      messageCodeAccess: ""
    },
    wordsGame,
    isScorm: 0,
    textButtonScorm: "",
    repeatActivity: true,
    weighted: 100,
    textFeedBack: "",
    textAfter: "",
    feedBack: false,
    percentajeFB: 60,
    version: 1,
    percentajeQuestions: "100",
    time: "0",
    diagonals: true,
    reverses: true,
    showResolve: true,
    evaluation: false,
    evaluationID: "",
    id,
    msgs: CROSSWORD_DEFAULT_MSGS
  };
  const dataEncoded = encryptGameData(JSON.stringify(gameData));

  const instructionsDiv = input.instructions
    ? `<div class="sopa-instructions gameQP-instructions">${input.instructions}</div>`
    : "";

  const htmlView = [
    `<div class="sopa-IDevice">`,
    `  <div class="game-evaluation-ids js-hidden" data-id="${id}" data-evaluationb="false" data-evaluationid=""></div>`,
    `  <div class="sopa-version js-hidden">2</div>`,
    `  <div class="sopa-feedback-game"></div>`,
    instructionsDiv ? `  ${instructionsDiv}` : "",
    `  <div class="sopa-DataGame js-hidden">${dataEncoded}</div>`,
    `  <div class="sopa-bns js-hidden"></div>`,
    `</div>`
  ]
    .filter(Boolean)
    .join("\n");

  return {
    id,
    pageId: input.pageId,
    blockId: input.blockId,
    typeName: "word-search",
    title: input.title ?? "Word search",
    htmlView,
    jsonProperties: {
      ideviceId: id,
      textInfoDurationInput: "",
      textInfoDurationTextInput: "",
      textInfoParticipantsInput: "",
      textInfoParticipantsTextInput: "",
      textTextarea: htmlView,
      textFeedbackInput: "",
      textFeedbackTextarea: ""
    },
    order: input.order,
    visibility: true
  };
}
