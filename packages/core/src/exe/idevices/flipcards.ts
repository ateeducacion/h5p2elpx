import type { ElpxIdevice } from "../model.ts";
import { newIdeviceId } from "../ids.ts";
import { escapeHtml } from "../../utils/html.ts";

export type FlipcardSide = {
  /** Text shown when face is up. */
  text?: string;
  /** Optional image URL (already rewritten via the html URL form). */
  image?: string;
};

export type FlipcardEntry = {
  front: FlipcardSide;
  back: FlipcardSide;
};

export type FlipcardsInput = {
  pageId: string;
  blockId: string;
  order: number;
  cards: FlipcardEntry[];
  title?: string;
  /** Optional intro text shown above the game */
  instructions?: string;
};

const FLIPCARDS_DEFAULT_MSGS = {
  msgSubmit: "Submit",
  msgClue: "Cool! The clue is:",
  msgCodeAccess: "Access code",
  msgPlayAgain: "Play Again",
  msgPlayStart: "Click here to play",
  msgScore: "Score",
  msgWeight: "Weight",
  msgErrors: "Errors",
  msgHits: "Hits",
  msgMinimize: "Minimize",
  msgMaximize: "Maximize",
  msgCool: "Cool!",
  msgFullScreen: "Full Screen",
  msgExitFullScreen: "Exit Full Screen",
  msgSuccesses: "Right! | Excellent! | Great! | Very good! | Perfect!",
  msgFailures: "It was not that! | Incorrect! | Not correct! | Sorry! | Error!",
  msgNoImage: "No picture question",
  msgEndGameScore: "Please start the game before saving your score.",
  msgScoreScorm: "The score can't be saved because this page is not part of a SCORM package.",
  msgOnlySaveScore: "You can only save the score once!",
  msgOnlySave: "You can only save once",
  msgInformation: "Information",
  msgYouScore: "Your score",
  msgAuthor: "Authorship",
  msgOnlySaveAuto: "Your score will be saved after each question. You can only play once.",
  msgSaveAuto: "Your score will be automatically saved after each question.",
  msgSeveralScore: "You can save the score as many times as you want",
  msgYouLastScore: "The last score saved is",
  msgActityComply: "You have already done this activity.",
  msgPlaySeveralTimes: "You can do this activity as many times as you want",
  msgClose: "Close",
  msgAudio: "Audio",
  msgPreviousCard: "Previous",
  msgNextCard: "Next",
  msgNumQuestions: "Number of cards",
  msgTrue: "True",
  msgFalse: "False",
  msgTryAgain: "You need at least %s% of correct answers to get the information. Please try again.",
  mgsAllQuestions: "Questions completed!",
  msgTrue1: "Right. That's the card.",
  msgTrue2: "You're wrong. That's not the card.",
  msgFalse1: "Right. That's not the card.",
  msgFalse2: "You're wrong. That's the card.",
  mgsClickCard: "Click on the card",
  msgEndTime: "Game time is over. Your score is %s.",
  msgEnd: "Finish",
  msgEndGameM: "You finished the game. Your score is %s.",
  msgUncompletedActivity: "Incomplete activity",
  msgSuccessfulActivity: "Activity: Passed. Score: %s",
  msgUnsuccessfulActivity: "Activity: Not passed. Score: %s",
  msgTypeGame: "Memory cards"
};

function stringifyForDataGame(data: unknown): string {
  return JSON.stringify(data)
    .replace(/&/g, "\\u0026")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e");
}

function extractImageFromHtml(html: string): { src: string; alt: string; html: string } {
  const match = html.match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
  if (!match) return { src: "", alt: "", html };
  const img = match[0] ?? "";
  const alt = img.match(/\balt=["']([^"']*)["']/i)?.[1] ?? "";
  return {
    src: match[1] ?? "",
    alt,
    html: html
      .replace(img, "")
      .replace(/^<br\s*\/?>|<br\s*\/?>$/gi, "")
      .trim()
  };
}

function buildCardSide(side: FlipcardSide): { url: string; alt: string; text: string } {
  const rawText = side.text ?? "";
  const extracted = extractImageFromHtml(rawText);
  return {
    url: side.image ?? extracted.src,
    alt: extracted.alt,
    text: side.image ? rawText : extracted.html
  };
}

function buildCard(card: FlipcardEntry): Record<string, unknown> {
  const front = buildCardSide(card.front);
  const back = buildCardSide(card.back);
  return {
    id: "",
    type: 2,
    url: front.url,
    audio: "",
    x: 0,
    y: 0,
    author: "",
    alt: front.alt,
    eText: front.text,
    color: "#000000",
    backcolor: "#ffffff",
    correct: 0,
    urlBk: back.url,
    audioBk: "",
    xBk: 0,
    yBk: 0,
    authorBk: "",
    altBk: back.alt,
    eTextBk: back.text,
    colorBk: "#000000",
    backcolorBk: "#ffffff"
  };
}

function buildMediaLinks(cards: Record<string, unknown>[]): string[] {
  const media = [
    { prop: "url", className: "flipcards-LinkImages" },
    { prop: "urlBk", className: "flipcards-LinkImagesBack" },
    { prop: "audio", className: "flipcards-LinkAudios" },
    { prop: "audioBk", className: "flipcards-LinkAudiosBack" }
  ];
  return cards.flatMap((card, index) =>
    media.flatMap(({ prop, className }) => {
      const value = card[prop];
      if (typeof value !== "string" || value.length === 0 || /^https?:\/\//i.test(value)) return [];
      return [`<a href="${escapeHtml(value)}" class="js-hidden ${className}">${index}</a>`];
    })
  );
}

/**
 * Mirrors the `flipcards` iDevice runtime format. eXe's export code
 * renders from plain JSON in `.flipcards-DataGame` with a `cardsGame`
 * array; it does not decode a URI-encoded `cards` payload.
 */
export function buildFlipcardsIdevice(input: FlipcardsInput): ElpxIdevice {
  const id = newIdeviceId();
  const cardsGame = input.cards.map(buildCard);
  const gameData = {
    id,
    typeGame: "FlipCards",
    author: "",
    randomCards: false,
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
    cardsGame,
    isScorm: 0,
    textButtonScorm: "",
    repeatActivity: true,
    weighted: 100,
    textAfter: "",
    percentajeCards: 100,
    version: 1.3,
    type: 0,
    showSolution: true,
    timeShowSolution: 3,
    time: 0,
    evaluation: false,
    evaluationID: "",
    imgCard: "",
    msgs: FLIPCARDS_DEFAULT_MSGS
  };
  const dataGameJson = stringifyForDataGame(gameData);

  const htmlView = [
    `<div class="flipcards-IDevice">`,
    `  <div class="game-evaluation-ids js-hidden" data-id="${id}" data-evaluationb="false" data-evaluationid=""></div>`,
    input.instructions ? `  <div class="flipcards-instructions">${input.instructions}</div>` : "",
    `  <div class="flipcards-DataGame js-hidden">${dataGameJson}</div>`,
    ...buildMediaLinks(cardsGame).map((link) => `  ${link}`),
    `  <div class="flipcards-bns js-hidden">Your browser is not compatible with this tool.</div>`,
    `</div>`
  ]
    .filter(Boolean)
    .join("\n");

  return {
    id,
    pageId: input.pageId,
    blockId: input.blockId,
    typeName: "flipcards",
    title: input.title ?? "Memory cards",
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
