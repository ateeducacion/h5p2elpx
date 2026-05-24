import type { ElpxIdevice } from "../model.ts";
import { newIdeviceId } from "../ids.ts";
import { escapeHtml } from "../../utils/html.ts";
import { MAP_DEFAULT_MSGS } from "./map-i18n.ts";

export type MapPoint = {
  /** Point centre (or rectangle top-left), in image-relative units. */
  x: number;
  y: number;
  /** Rectangle bottom-right (only when iconType === 1). */
  x1?: number;
  y1?: number;
  /** Polygon vertices (only when iconType === 2). */
  vertices?: { x: number; y: number }[];
  /** 0 = text popup (default), 1 = image, 2 = text-question, 3 = audio. */
  type?: 0 | 1 | 2 | 3;
  /** 0 = point, 1 = rectangle, 2 = polygon. */
  iconType?: 0 | 1 | 2;
  title?: string;
  toolTip?: string;
  /** Rich-HTML popup body. */
  eText?: string;
  link?: string;
  /** Used when isQuiz: marks a correct vs. incorrect hotspot. */
  correct?: boolean;
};

export type MapInput = {
  pageId: string;
  blockId: string;
  order: number;
  title?: string;
  instructions?: string;
  /** Background image URL — rewrite via `forHtml` before passing. */
  imageUrl: string;
  imageAlt?: string;
  points: MapPoint[];
  /** When true, the map runs as a quiz (selectsGame on, evaluationG = 1). */
  isQuiz?: boolean;
};

let pointSeq = 0;
function nextPointId(): string {
  pointSeq = (pointSeq + 1) >>> 0;
  return `p${Date.now().toString(36)}${pointSeq.toString(36)}`;
}

function buildPoint(p: MapPoint): Record<string, unknown> {
  const id = nextPointId();
  const iconType = p.iconType ?? 0;
  const type = p.type ?? 0;
  return {
    id,
    title: p.title ?? "",
    type,
    url: "",
    video: "",
    x: p.x,
    y: p.y,
    x1: p.x1 ?? 0,
    y1: p.y1 ?? 0,
    points: iconType === 2 && p.vertices ? p.vertices : [],
    pointsd: [],
    footer: "",
    author: "",
    alt: "",
    iVideo: 0,
    fVideo: 0,
    eText: p.eText ?? "",
    iconType,
    question: "",
    question_audio: "",
    toolTip: p.toolTip ?? "",
    link: p.link ?? "",
    color: "#000000",
    fontSize: "14",
    correct: p.correct ? 1 : 0,
    map: { id: `a${id}`, url: "", alt: "", author: "", pts: [] },
    slides: [{ id: `s${id}`, title: "", url: "", author: "", alt: "", footer: "" }],
    tests: [],
    activeSlide: 0,
    activeTest: 0
  };
}

/**
 * Mirrors the eXeLearning `map` (Mapa) iDevice. Despite the catalog
 * name, this iDevice accepts an arbitrary background image and lets
 * the author pin points/rectangles/polygons on it — making it the
 * right native target for H5P's hotspot families.
 *
 * Storage shape derived from `validateData()` at
 * `public/files/perm/idevices/base/map/edition/map.js:2576-2611` and
 * `getDefaultPoint()` at line 1373. Unlike crossword/word-search, the
 * data inside `<div class="mapa-DataGame js-hidden">` is **plain JSON**
 * — no XOR encryption and no URI-encoding (verified against
 * `exelearning/test/fixtures/todos-los-idevices_dos_informes.elpx`).
 *
 * Uses the same `textTextarea` jsonProperties wrapper as crossword.
 */
export function buildMapIdevice(input: MapInput): ElpxIdevice {
  const id = newIdeviceId();
  const points = input.points.map(buildPoint);
  const gameData = {
    typeGame: "Mapa",
    instructions: input.instructions ?? "",
    showMinimize: false,
    showActiveAreas: true,
    author: "",
    url: input.imageUrl,
    authorImage: "",
    altImage: input.imageAlt ?? "",
    itinerary: {
      showClue: false,
      clueGame: "",
      percentageClue: 40,
      showCodeAccess: false,
      codeAccess: "",
      messageCodeAccess: ""
    },
    points,
    isScorm: 0,
    textButtonScorm: "",
    repeatActivity: true,
    weighted: 100,
    textAfter: "",
    evaluationG: input.isQuiz ? 1 : 0,
    selectsGame: !!input.isQuiz,
    isNavigable: true,
    showSolution: true,
    timeShowSolution: 5,
    version: 3,
    percentajeIdentify: 100,
    percentajeShowQ: 100,
    percentajeQuestions: "100",
    autoShow: false,
    autoAudio: false,
    optionsNumber: 4,
    evaluation: false,
    evaluationID: "",
    id,
    order: 0,
    hideScoreBar: false,
    hideAreas: false,
    msgs: MAP_DEFAULT_MSGS
  };

  const instructionsDiv = input.instructions
    ? `<div class="mapa-instructions gameQP-instructions">${input.instructions}</div>`
    : "";

  const htmlView = [
    `<div class="mapa-IDevice">`,
    `  <div class="game-evaluation-ids js-hidden" data-id="${id}" data-evaluationb="false" data-evaluationid=""></div>`,
    `  <div class="mapa-version js-hidden">3</div>`,
    `  <div class="mapa-feedback-game"></div>`,
    instructionsDiv ? `  ${instructionsDiv}` : "",
    `  <div class="mapa-DataGame js-hidden">${JSON.stringify(gameData)}</div>`,
    `  <img src="${escapeHtml(input.imageUrl)}" class="js-hidden mapa-ImageMap" data-id="0" alt="${escapeHtml(input.imageAlt ?? "")}" />`,
    `</div>`
  ]
    .filter(Boolean)
    .join("\n");

  return {
    id,
    pageId: input.pageId,
    blockId: input.blockId,
    typeName: "map",
    title: input.title ?? "Map",
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
