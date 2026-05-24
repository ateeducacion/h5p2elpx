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
  | NormalizedUnsupportedNode;
