export type BaseNode = {
  id: string;
  sourceType: string;
  title?: string;
  metadata?: Record<string, unknown>;
};

export type NormalizedTextNode = BaseNode & {
  kind: "text";
  html: string;
};

export type NormalizedImageNode = BaseNode & {
  kind: "image";
  src: string;
  alt?: string;
  caption?: string;
};

export type NormalizedAudioNode = BaseNode & {
  kind: "audio";
  src: string;
};

export type NormalizedVideoNode = BaseNode & {
  kind: "video";
  src: string;
  poster?: string;
};

export type NormalizedAnswer = {
  text: string;
  correct?: boolean;
  feedback?: string;
};

export type NormalizedQuestionNode = BaseNode & {
  kind: "question";
  questionType: "truefalse" | "multichoice" | "blanks" | "unknown";
  prompt: string;
  answers?: NormalizedAnswer[];
  feedback?: string;
  /** Optional media (typically an image) authored alongside the question. */
  media?: { src: string; alt?: string };
};

export type NormalizedSlideNode = BaseNode & {
  kind: "slide";
  children: NormalizedNode[];
};

export type NormalizedSlideDeckNode = BaseNode & {
  kind: "slide-deck";
  slides: NormalizedSlideNode[];
};

export type NormalizedPageNode = BaseNode & {
  kind: "page";
  children: NormalizedNode[];
};

export type NormalizedContainerNode = BaseNode & {
  kind: "container";
  children: NormalizedNode[];
};

export type NormalizedUnsupportedNode = BaseNode & {
  kind: "unsupported";
  reason: string;
  originalLibrary: string;
  originalData?: unknown;
};

export type NormalizedFlipcardsNode = BaseNode & {
  kind: "flipcards";
  cards: Array<{ front: string; back: string }>;
};

export type NormalizedCrosswordEntry = {
  word: string;
  definition: string;
};

export type NormalizedCrosswordNode = BaseNode & {
  kind: "crossword";
  entries: NormalizedCrosswordEntry[];
};

export type NormalizedInteractiveVideoSlide =
  | { type: "text"; text: string; startTime: number }
  | {
      type: "singleChoice";
      question: string;
      answers: Array<[string, 0 | 1]>;
      startTime: number;
    };

export type NormalizedInteractiveVideoNode = BaseNode & {
  kind: "interactive-video";
  src: string;
  description?: string;
  slides: NormalizedInteractiveVideoSlide[];
  /** Machine names of interactions we could not represent as slides. */
  skippedInteractions?: string[];
};

export type NormalizedBeforeAfterNode = BaseNode & {
  kind: "beforeafter";
  before: { src: string; label?: string; alt?: string };
  after: { src: string; label?: string; alt?: string };
};

export type NormalizedIframeNode = BaseNode & {
  kind: "iframe";
  src: string;
  width?: number;
  height?: number;
};

export type NormalizedWordSearchNode = BaseNode & {
  kind: "word-search";
  words: string[];
  taskDescription?: string;
};

export type NormalizedHotspotMapPoint = {
  /** Centre x (or rectangle top-left x), in the same units as the image. */
  x: number;
  y: number;
  /** Rectangle bottom-right (when present, the point is rendered as a rectangle). */
  x1?: number;
  y1?: number;
  title?: string;
  toolTip?: string;
  /** Rich-HTML popup body shown when the learner clicks the hotspot. */
  eText?: string;
  link?: string;
  correct?: boolean;
};

export type NormalizedHotspotMapNode = BaseNode & {
  kind: "hotspot-map";
  imageUrl: string;
  imageAlt?: string;
  instructions?: string;
  /** When true, the map runs as a quiz (selectsGame mode). */
  isQuiz?: boolean;
  points: NormalizedHotspotMapPoint[];
};

/**
 * One element on a Course Presentation slide, with H5P's percent-based
 * positioning preserved verbatim. `payload` is the discriminated body.
 * URL rewriting is deferred to convert-time so the adapter stays pure.
 */
export type CpSlideElement = {
  /** Percent of slide width (0..100). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** True when H5P rendered the element as a transparent overlay. */
  invisible?: boolean;
  /** Z-order in the source. Lower draws first. */
  order: number;
  payload:
    | { kind: "image"; src: string; alt?: string }
    | { kind: "html"; html: string }
    | { kind: "goto"; goToSlide: number }
    | { kind: "unsupported"; library: string };
};

export type CpSlide = {
  title?: string;
  elements: CpSlideElement[];
};

export type NormalizedCoursePresentationNode = BaseNode & {
  kind: "course-presentation";
  slides: CpSlide[];
};

export type NormalizedNode =
  | NormalizedTextNode
  | NormalizedImageNode
  | NormalizedAudioNode
  | NormalizedVideoNode
  | NormalizedQuestionNode
  | NormalizedSlideDeckNode
  | NormalizedSlideNode
  | NormalizedPageNode
  | NormalizedContainerNode
  | NormalizedFlipcardsNode
  | NormalizedCrosswordNode
  | NormalizedInteractiveVideoNode
  | NormalizedBeforeAfterNode
  | NormalizedIframeNode
  | NormalizedWordSearchNode
  | NormalizedHotspotMapNode
  | NormalizedCoursePresentationNode
  | NormalizedUnsupportedNode;
