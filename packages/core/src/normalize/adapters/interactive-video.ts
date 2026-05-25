import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";
import { machineNameOnly } from "../../h5p/library-ref.ts";

export const machineName = "H5P.InteractiveVideo";

type RawInteraction = {
  duration?: { from?: number; to?: number };
  action?: { library?: string; params?: any };
  label?: string;
};

export type InteractiveVideoSlide =
  | { type: "text"; text: string; startTime: number }
  | {
      type: "singleChoice";
      question: string;
      answers: Array<[string, 0 | 1]>;
      startTime: number;
    };

export function adapt(content: any): NormalizedNode {
  const iv = content?.interactiveVideo ?? content ?? {};
  const sources: any[] = Array.isArray(iv?.video?.files) ? iv.video.files : [];
  const src = typeof sources[0]?.path === "string" ? sources[0].path : "";
  const interactions: RawInteraction[] = Array.isArray(iv?.assets?.interactions)
    ? iv.assets.interactions
    : [];

  const slides: InteractiveVideoSlide[] = [];
  const skipped: string[] = [];

  for (const it of interactions) {
    const startTime = Math.max(0, Math.round(Number(it?.duration?.from) || 0));
    const lib = machineNameOnly(typeof it?.action?.library === "string" ? it.action.library : "");
    const params = it?.action?.params ?? {};
    if (lib === "H5P.Text" || lib === "H5P.AdvancedText") {
      const text = typeof params?.text === "string" ? params.text : "";
      if (text) slides.push({ type: "text", text, startTime });
      continue;
    }
    if (lib === "H5P.MultiChoice") {
      const question = typeof params?.question === "string" ? params.question : "";
      const answers: Array<[string, 0 | 1]> = Array.isArray(params?.answers)
        ? params.answers.map(
            (a: any) =>
              [typeof a?.text === "string" ? a.text : "", a?.correct ? 1 : 0] as [string, 0 | 1]
          )
        : [];
      if (answers.length > 0) {
        slides.push({ type: "singleChoice", question, answers, startTime });
        continue;
      }
    }
    if (lib === "H5P.TrueFalse") {
      const question = typeof params?.question === "string" ? params.question : "";
      const isTrue = String(params?.correct ?? "true").toLowerCase() === "true";
      slides.push({
        type: "singleChoice",
        question,
        answers: [
          ["True", isTrue ? 1 : 0],
          ["False", isTrue ? 0 : 1]
        ],
        startTime
      });
      continue;
    }
    if (lib === "H5P.SingleChoiceSet") {
      const first = Array.isArray(params?.choices) ? params.choices[0] : null;
      if (first && Array.isArray(first.answers)) {
        const question = typeof first.question === "string" ? first.question : "";
        const answers: Array<[string, 0 | 1]> = first.answers.map(
          (label: any, idx: number) => [String(label ?? ""), idx === 0 ? 1 : 0] as [string, 0 | 1]
        );
        slides.push({ type: "singleChoice", question, answers, startTime });
        continue;
      }
    }
    skipped.push(lib || "(unknown)");
  }

  slides.sort((a, b) => a.startTime - b.startTime);

  return {
    id: uniqueId("iv"),
    sourceType: machineName,
    kind: "interactive-video",
    src,
    title: typeof content?.metadata?.title === "string" ? content.metadata.title : undefined,
    description: typeof iv?.summary?.task === "string" ? iv.summary.task : undefined,
    slides,
    skippedInteractions: skipped
  };
}
