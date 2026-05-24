import type { ElpxIdevice } from "../model.ts";
import { newIdeviceId } from "../ids.ts";
import { encryptGameData } from "../encrypt.ts";

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
 *     is NOT plain URI-encoded JSON. eXe XOR-encrypts every char with
 *     key 146 and wraps it with the legacy JS `escape()` — see
 *     `../encrypt.ts`. Plaintext URI-encoded data silently fails to load.
 *  2. The iDevice uses the standard "text" jsonProperties pattern
 *     (`textTextarea` holds the full htmlView, `textInfoDuration*` /
 *     `textFeedback*` keys are present even when empty). See
 *     `doc/elpx-format/idevices/snippets.md` → "crossword".
 *
 * The htmlView mirrors the runtime-generated structure in
 * `public/files/perm/idevices/base/crossword/edition/crossword.js`
 * (`crucigrama-IDevice` wrapper + `game-evaluation-ids`,
 * `crucigrama-version`, `crucigrama-feedback-game`, optional
 * `crucigrama-instructions`, `crucigrama-DataGame`, `crucigrama-bns`).
 */
export function buildCrosswordIdevice(input: CrosswordInput): ElpxIdevice {
  const id = newIdeviceId();
  const wordsGame = input.words.map((w) => ({
    word: w.word,
    definition: w.definition,
    url: w.url ?? "",
    audio: w.audio ?? ""
  }));
  const gameData = {
    id,
    typeGame: "Crossword",
    wordsGame,
    percentajeQuestions: 100,
    tilde: true,
    evaluation: false,
    evaluationID: "",
    repeatActivity: true,
    weighted: 100,
    isScorm: 0
  };
  const dataEncoded = encryptGameData(JSON.stringify(gameData));

  const instructionsDiv = input.instructions
    ? `<div class="crucigrama-instructions gameQP-instructions">${input.instructions}</div>`
    : "";

  const htmlView = [
    `<div class="crucigrama-IDevice">`,
    `  <div class="game-evaluation-ids js-hidden" data-id="${id}" data-evaluationb="false" data-evaluationid=""></div>`,
    `  <div class="crucigrama-version js-hidden">1</div>`,
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
      textInfoDurationTextInput: "Duración",
      textInfoParticipantsInput: "",
      textInfoParticipantsTextInput: "Agrupamiento",
      textTextarea: htmlView,
      textFeedbackInput: "Mostrar retroalimentación",
      textFeedbackTextarea: ""
    },
    order: input.order,
    visibility: true
  };
}
