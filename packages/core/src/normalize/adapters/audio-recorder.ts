import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.AudioRecorder";

export function adapt(content: any): NormalizedNode {
  const title = typeof content?.title === "string" ? content.title : "Audio recording task";
  const ready =
    typeof content?.l10n?.statusReadyToRecord === "string"
      ? content.l10n.statusReadyToRecord
      : "Press a button below to record your answer.";
  const finished =
    typeof content?.l10n?.statusFinishedRecording === "string"
      ? content.l10n.statusFinishedRecording
      : "You have successfully recorded your answer.";

  return {
    id: uniqueId("ar"),
    sourceType: machineName,
    kind: "text",
    html: [
      `<p><strong>${title}</strong></p>`,
      `<p>${ready}</p>`,
      `<p><em>Note: live microphone recording is not preserved in eXeLearning export.</em></p>`,
      `<p>${finished}</p>`
    ].join("\n")
  };
}
