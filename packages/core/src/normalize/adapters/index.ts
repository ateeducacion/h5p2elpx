import type { NormalizedNode } from "../nodes.ts";
import { machineNameOnly } from "../../h5p/library-ref.ts";
import * as text from "./text.ts";
import * as advancedText from "./advanced-text.ts";
import * as image from "./image.ts";
import * as audio from "./audio.ts";
import * as video from "./video.ts";
import * as multichoice from "./multichoice.ts";
import * as truefalse from "./truefalse.ts";
import * as blanks from "./blanks.ts";
import * as column from "./column.ts";
import * as coursePresentation from "./course-presentation.ts";
import * as interactiveBook from "./interactive-book.ts";
import * as singleChoiceSet from "./single-choice-set.ts";
import * as dialogcards from "./dialogcards.ts";
import * as memoryGame from "./memory-game.ts";
import * as dragText from "./drag-text.ts";
import * as dragQuestion from "./drag-question.ts";
import * as markTheWords from "./mark-the-words.ts";
import * as imageHotspots from "./image-hotspots.ts";
import * as interactiveVideo from "./interactive-video.ts";
import * as summary from "./summary.ts";
import * as table from "./table.ts";
import { adaptUnsupported } from "./unsupported.ts";

type AdapterModule = {
  machineName: string;
  adapt: (content: any) => NormalizedNode;
};

const REGISTRY: Record<string, AdapterModule> = Object.fromEntries(
  (
    [
      text,
      advancedText,
      image,
      audio,
      video,
      multichoice,
      truefalse,
      blanks,
      column,
      coursePresentation,
      interactiveBook,
      singleChoiceSet,
      dialogcards,
      memoryGame,
      dragText,
      dragQuestion,
      markTheWords,
      imageHotspots,
      interactiveVideo,
      summary,
      table
    ] as AdapterModule[]
  ).map((m) => [m.machineName, m])
);

export function adaptH5pSubContent(libraryName: string, params: unknown): NormalizedNode {
  const machine = machineNameOnly(libraryName);
  const adapter = REGISTRY[machine];
  if (adapter) {
    try {
      return adapter.adapt(params);
    } catch (err) {
      return adaptUnsupported(machine, { error: (err as Error).message, params });
    }
  }
  return adaptUnsupported(machine, params);
}

export function listRegisteredMachines(): string[] {
  return Object.keys(REGISTRY);
}
