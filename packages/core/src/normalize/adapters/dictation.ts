import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";
import { extractIntroMedia } from "../utils/intro-media.ts";

export const machineName = "H5P.Dictation";

/** H5P.Dictation content.json: { sentences: [ { sample, sampleAlternative?, text, description? } ], taskDescription } */
export function adapt(content: any): NormalizedNode {
  const sentences: any[] = Array.isArray(content?.sentences) ? content.sentences : [];
  // Render the dictation as fill-in-the-blanks: `*answer*` per sentence
  // (the form writer's `blanksToFill` helper expects `*answer*` markers).
  // The audio prompt is dropped with a note — eXe form has no audio slot.
  const blanks = sentences
    .map((s) => {
      const text = typeof s?.text === "string" ? s.text : "";
      // Use the first alternative as the target (split on |)
      const target = text.split("|")[0].trim();
      return target ? `*${target}*` : "";
    })
    .filter((t) => t.length > 0);
  const html = blanks.length > 0 ? blanks.join("<br />") : "<p>(empty dictation)</p>";
  return {
    id: uniqueId("dict"),
    sourceType: machineName,
    kind: "question",
    questionType: "blanks",
    prompt:
      typeof content?.taskDescription === "string"
        ? content.taskDescription
        : "Type the dictated text:",
    answers: [{ text: html }],
    media: extractIntroMedia(content)
  };
}
