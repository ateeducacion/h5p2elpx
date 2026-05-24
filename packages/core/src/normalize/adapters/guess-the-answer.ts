import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.GuessTheAnswer";

/** H5P.GuessTheAnswer content.json:
 *   { image: { path, alt? } | { params: { file: { path }, alt } },
 *     taskDescription?, solutionLabel?, solutionText? }
 * Single image+question/answer reveal — natural fit for a one-card flipcards iDevice.
 */
export function adapt(content: any): NormalizedNode {
  const imgPath =
    typeof content?.image?.path === "string"
      ? content.image.path
      : typeof content?.image?.params?.file?.path === "string"
        ? content.image.params.file.path
        : "";
  const alt =
    typeof content?.image?.alt === "string"
      ? content.image.alt
      : typeof content?.image?.params?.alt === "string"
        ? content.image.params.alt
        : "";
  const prompt =
    typeof content?.taskDescription === "string" && content.taskDescription
      ? content.taskDescription
      : "";
  const solution = typeof content?.solutionText === "string" ? content.solutionText : "";

  const frontParts: string[] = [];
  if (imgPath) frontParts.push(`<img src="${imgPath}" alt="${alt}" />`);
  if (prompt) frontParts.push(prompt);

  return {
    id: uniqueId("gta"),
    sourceType: machineName,
    kind: "flipcards",
    cards: [{ front: frontParts.join("<br />"), back: solution }]
  };
}
