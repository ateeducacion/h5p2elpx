import type { ElpxIdevice } from "../model.ts";
import { newIdeviceId } from "../ids.ts";
import { encryptGameData } from "../encrypt.ts";
import { CROSSWORD_DEFAULT_MSGS } from "./crossword-i18n.ts";

export type CrosswordEntry = {
  /** The answer word (uppercased by the runtime). */
  word: string;
  /** Clue / definition shown to the learner. */
  definition: string;
  /** Optional illustrative image URL (already rewritten for the html view). */
  url?: string;
  /** Optional audio clip URL. */
  audio?: string;
};

export type CrosswordInput = {
  pageId: string;
  blockId: string;
  order: number;
  words: CrosswordEntry[];
  title?: string;
  instructions?: string;
};

/**
 * Mirrors the eXeLearning `crossword` iDevice. Two non-obvious bits:
 *
 *  1. The data blob inside `<div class="crucigrama-DataGame js-hidden">`
 *     is XOR-encrypted with key 146 and wrapped with the legacy JS
 *     `escape()` — see `../encrypt.ts`. Plaintext URI-encoded data
 *     silently fails to load in the eXe editor.
 *  2. The decrypted JSON must use `typeGame: "Crucigrama"` (Spanish —
 *     the runtime checks this literally at `crossword.js:1427`) and
 *     `version: 2`. It also requires the full set of fields validated
 *     by `crossword.js:validateData` (line ~770): `itinerary`,
 *     `showSolution`, `caseSensitive`, `tilde`, `feedBack`, the SCORM
 *     keys, and the `msgs` i18n bag. Missing fields cause the editor's
 *     reader to bail silently. See `crossword-i18n.ts` for the bag.
 *
 * The iDevice also uses the standard "text" jsonProperties pattern
 * (`textTextarea` holds the full htmlView, `textInfoDuration*` /
 * `textFeedback*` keys are present even when empty).
 */
export function buildCrosswordIdevice(input: CrosswordInput): ElpxIdevice {
  const id = newIdeviceId();
  const wordsGame = input.words.map((w) => ({
    word: w.word,
    definition: w.definition,
    x: 0,
    y: 0,
    author: "",
    alt: "",
    url: w.url ?? "",
    audio: w.audio ?? "",
    percentageShow: null
  }));
  const gameData = {
    typeGame: "Crucigrama",
    instructions: input.instructions ?? "",
    showMinimize: false,
    showSolution: true,
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
    hasBack: false,
    urlBack: "",
    textButtonScorm: "",
    repeatActivity: true,
    weighted: 100,
    textFeedBack: "",
    textAfter: "",
    caseSensitive: false,
    tilde: true,
    feedBack: false,
    percentajeFB: 60,
    version: 2,
    evaluation: false,
    evaluationID: "",
    percentajeQuestions: "100",
    difficulty: "100",
    time: "0",
    authorBackImage: "",
    id,
    msgs: CROSSWORD_DEFAULT_MSGS
  };
  const dataEncoded = encryptGameData(JSON.stringify(gameData));

  const instructionsDiv = input.instructions
    ? `<div class="crucigrama-instructions gameQP-instructions">${input.instructions}</div>`
    : "";

  const htmlView = [
    `<div class="crucigrama-IDevice">`,
    `  <div class="game-evaluation-ids js-hidden" data-id="${id}" data-evaluationb="false" data-evaluationid=""></div>`,
    `  <div class="crucigrama-version js-hidden">2</div>`,
    `  <div class="crucigrama-feedback-game"></div>`,
    instructionsDiv ? `  ${instructionsDiv}` : "",
    `  <div class="crucigrama-DataGame js-hidden">${dataEncoded}</div>`,
    `  <div class="crucigrama-bns js-hidden"></div>`,
    `</div>`
  ]
    .filter(Boolean)
    .join("\n");

  return {
    id,
    pageId: input.pageId,
    blockId: input.blockId,
    typeName: "crossword",
    title: input.title ?? "Crossword",
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
