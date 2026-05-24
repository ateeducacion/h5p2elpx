import type { ElpxIdevice } from "../model.ts";
import { newIdeviceId } from "../ids.ts";

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
 * Mirrors the eXeLearning `crossword` iDevice (runtime `$eXeCrucigrama`,
 * `idevices/crossword/crossword.js` — `loadDataGame` at line 1869).
 * Same Pattern 2 used by `flipcards`: a URI-encoded JSON blob inside a
 * `<div class="crucigrama-DataGame js-hidden">`.
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
  const dataEncoded = encodeURIComponent(JSON.stringify(gameData));

  const htmlView = [
    `<div class="crucigrama-IDevice" id="${id}-container">`,
    input.instructions ? `  <div class="crucigrama-Instructions">${input.instructions}</div>` : "",
    `  <div class="crucigrama-DataGame js-hidden" data-id="${id}">${dataEncoded}</div>`,
    `  <div class="crucigrama-Game" id="${id}-game"></div>`,
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
    jsonProperties: { ideviceId: id, dataGame: dataEncoded },
    order: input.order,
    visibility: true
  };
}
