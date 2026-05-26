import type { NormalizedNode } from "../nodes.ts";
import { machineNameOnly } from "../../h5p/library-ref.ts";
import * as text from "./text.ts";
import * as advancedText from "./advanced-text.ts";
import * as textInputField from "./text-input-field.ts";
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
import * as crossword from "./crossword.ts";
import * as multipleHotspotQuestion from "./multiple-hotspot-question.ts";
import * as imageJuxtaposition from "./image-juxtaposition.ts";
import * as iframeEmbed from "./iframe-embed.ts";
import * as findTheWords from "./find-the-words.ts";
import * as flashcards from "./flashcards.ts";
import * as imagePair from "./image-pair.ts";
import * as accordion from "./accordion.ts";
import * as essay from "./essay.ts";
import * as sortParagraphs from "./sort-paragraphs.ts";
import * as imageSequencing from "./image-sequencing.ts";
import * as imageSlider from "./image-slider.ts";
import * as collage from "./collage.ts";
import * as questionSet from "./question-set.ts";
import * as questionnaire from "./questionnaire.ts";
import * as simpleMultiChoice from "./simple-multi-choice.ts";
import * as dictation from "./dictation.ts";
import * as imageHotspotQuestion from "./image-hotspot-question.ts";
import * as guessTheAnswer from "./guess-the-answer.ts";
import * as adventCalendar from "./advent-calendar.ts";
import * as informationWall from "./information-wall.ts";
import * as openEndedQuestion from "./open-ended-question.ts";
import * as multiMediaChoice from "./multi-media-choice.ts";
import * as arithmeticQuiz from "./arithmetic-quiz.ts";
import * as complexFillTheBlanks from "./complex-fill-the-blanks.ts";
import * as agamotto from "./agamotto.ts";
import * as gameMap from "./game-map.ts";
import * as link from "./link.ts";
import * as documentationTool from "./documentation-tool.ts";
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
      textInputField,
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
      table,
      crossword,
      multipleHotspotQuestion,
      imageJuxtaposition,
      iframeEmbed,
      findTheWords,
      flashcards,
      imagePair,
      accordion,
      essay,
      sortParagraphs,
      imageSequencing,
      imageSlider,
      collage,
      questionSet,
      questionnaire,
      simpleMultiChoice,
      dictation,
      imageHotspotQuestion,
      guessTheAnswer,
      adventCalendar,
      informationWall,
      openEndedQuestion,
      multiMediaChoice,
      arithmeticQuiz,
      complexFillTheBlanks,
      agamotto,
      gameMap,
      link,
      documentationTool
    ] as AdapterModule[]
  ).map((m) => [m.machineName, m])
);

REGISTRY["H5P.InfoWall"] = informationWall;
REGISTRY["H5P.ImageMultipleHotspotQuestion"] = multipleHotspotQuestion;

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
