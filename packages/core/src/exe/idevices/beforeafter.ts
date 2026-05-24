import type { ElpxIdevice } from "../model.ts";
import { newIdeviceId } from "../ids.ts";
import { escapeHtml } from "../../utils/html.ts";

export type BeforeAfterInput = {
  pageId: string;
  blockId: string;
  order: number;
  beforeSrc: string;
  beforeLabel?: string;
  beforeAlt?: string;
  afterSrc: string;
  afterLabel?: string;
  afterAlt?: string;
  title?: string;
};

const BEFOREAFTER_DEFAULT_MSGS = {
  msgSubmit: "Submit",
  msgClue: "Cool! The clue is:",
  msgCodeAccess: "Access code",
  msgInformationLooking: "Cool! The information you were looking for",
  msgMinimize: "Minimize",
  msgMaximize: "Maximize",
  msgFullScreen: "Full Screen",
  msgExitFullScreen: "Exit Full Screen",
  msgNoImage: "No picture question",
  msgAuthor: "Authorship",
  msgAfterImage: "After image",
  msgBeforeImage: "Before image",
  msgNext: "Next",
  msgPrevious: "Previous",
  msgImage: "Image",
  msgScoreScorm: "The score can't be saved because this page is not part of a SCORM package.",
  msgQuestion: "Question",
  msgOnlySaveScore: "You can only save the score once!",
  msgOnlySave: "You can only save once",
  msgInformation: "Information",
  msgOnlySaveAuto: "Your score will be saved after each question. You can only play once.",
  msgSaveAuto: "Your score will be automatically saved after each question.",
  msgYouScore: "Your score",
  msgSeveralScore: "You can save the score as many times as you want",
  msgYouLastScore: "The last score saved is",
  msgActityComply: "You have already done this activity.",
  msgPlaySeveralTimes: "You can do this activity as many times as you want",
  msgUncompletedActivity: "Incomplete activity",
  msgSuccessfulActivity: "Activity: Passed. Score: %s",
  msgUnsuccessfulActivity: "Activity: Not passed. Score: %s",
  msgTypeGame: "Before/After",
  msgPlayStart: "Click here to play"
};

function stringifyForDataGame(data: unknown): string {
  return JSON.stringify(data)
    .replace(/&/g, "\\u0026")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e");
}

function buildMediaLinks(card: Record<string, unknown>): string[] {
  return [
    { prop: "url", className: "beforeafter-LinkImages" },
    { prop: "urlBk", className: "beforeafter-LinkImagesBack" }
  ].flatMap(({ prop, className }) => {
    const value = card[prop];
    if (typeof value !== "string" || value.length === 0 || /^https?:\/\//i.test(value)) {
      return [];
    }
    return [`<a href="${escapeHtml(value)}" class="js-hidden ${className}">0</a>`];
  });
}

/**
 * Mirrors the `beforeafter` iDevice runtime format. eXe's export code
 * renders from `.beforeafter-DataGame`, not from static `<figure>` tags.
 */
export function buildBeforeAfterIdevice(input: BeforeAfterInput): ElpxIdevice {
  const id = newIdeviceId();
  const beforeLabel = input.beforeLabel ?? "Before";
  const afterLabel = input.afterLabel ?? "After";
  const card = {
    id: "",
    position: 50,
    vertical: false,
    url: input.afterSrc,
    author: "",
    alt: input.afterAlt ?? afterLabel,
    eText: afterLabel,
    urlBk: input.beforeSrc,
    authorBk: "",
    altBk: input.beforeAlt ?? beforeLabel,
    eTextBk: beforeLabel
  };
  const gameData = {
    typeGame: "BeforeAfter",
    author: "",
    instructions: "",
    isScorm: 0,
    textButtonScorm: "",
    repeatActivity: true,
    itinerary: {
      showClue: false,
      clueGame: "",
      percentageClue: 40,
      showCodeAccess: false,
      codeAccess: "",
      messageCodeAccess: ""
    },
    weighted: 100,
    cardsGame: [card],
    textAfter: "",
    version: 2,
    evaluation: false,
    evaluationID: "",
    id,
    msgs: BEFOREAFTER_DEFAULT_MSGS
  };
  const dataGameJson = stringifyForDataGame(gameData);
  const htmlView = [
    `<div class="beforeafter-IDevice">`,
    `  <div class="game-evaluation-ids js-hidden" data-id="${id}" data-evaluationb="false" data-evaluationid=""></div>`,
    `  <div class="beforeafter-DataGame js-hidden">${dataGameJson}</div>`,
    ...buildMediaLinks(card).map((link) => `  ${link}`),
    `  <div class="beforeafter-bns js-hidden">Your browser is not compatible with this tool.</div>`,
    `</div>`
  ].join("\n");

  return {
    id,
    pageId: input.pageId,
    blockId: input.blockId,
    typeName: "beforeafter",
    title: input.title ?? "Before / After",
    htmlView,
    jsonProperties: {},
    order: input.order,
    visibility: true
  };
}
