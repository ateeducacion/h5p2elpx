import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";
import { escapeHtml, sanitizeHtml } from "../../utils/html.ts";

export const machineName = "H5P.PersonalityQuiz";

function imagePath(value: any): string | null {
  return typeof value?.image?.file?.path === "string" && value.image.file.path
    ? value.image.file.path
    : null;
}

function imageHtml(value: any, altFallback = ""): string {
  const src = imagePath(value);
  if (!src) return "";
  const alt =
    typeof value?.image?.alt === "string" && value.image.alt ? value.image.alt : altFallback;
  return `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" /></figure>`;
}

export function adapt(content: any): NormalizedNode {
  const title =
    typeof content?.titleScreen?.title?.text === "string" && content.titleScreen.title.text.trim()
      ? content.titleScreen.title.text.trim()
      : typeof content?.title === "string" && content.title.trim()
        ? content.title.trim()
        : "Personality quiz";
  const questions: any[] = Array.isArray(content?.questions) ? content.questions : [];
  const personalities: any[] = Array.isArray(content?.personalities) ? content.personalities : [];

  const questionHtml = questions
    .map((question, index) => {
      const answers = Array.isArray(question?.answers) ? question.answers : [];
      const renderedAnswers = answers
        .map((answer: any) => {
          const text = typeof answer?.text === "string" ? answer.text : "";
          const tags =
            typeof answer?.personality === "string" && answer.personality
              ? `<p><em>Matches: ${escapeHtml(answer.personality)}</em></p>`
              : "";
          return `<li>${imageHtml(answer, text)}<p>${escapeHtml(text)}</p>${tags}</li>`;
        })
        .join("\n");
      return [
        `<section>`,
        `<h3>Question ${index + 1}</h3>`,
        `<p><strong>${escapeHtml(typeof question?.text === "string" ? question.text : "")}</strong></p>`,
        imageHtml(question, typeof question?.text === "string" ? question.text : ""),
        renderedAnswers ? `<ul>${renderedAnswers}</ul>` : "",
        `</section>`
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const personalityHtml = personalities
    .map((personality: any) => {
      const name = typeof personality?.name === "string" ? personality.name : "";
      const description =
        typeof personality?.description === "string" ? sanitizeHtml(personality.description) : "";
      return `<li>${imageHtml(personality, name)}<p><strong>${escapeHtml(name)}</strong></p>${description}</li>`;
    })
    .join("\n");

  return {
    id: uniqueId("pquiz"),
    sourceType: machineName,
    kind: "text",
    html: [
      `<h2>${escapeHtml(title)}</h2>`,
      imageHtml(content?.titleScreen, title),
      questionHtml,
      personalityHtml ? `<h3>Possible results</h3><ul>${personalityHtml}</ul>` : "",
      `<p><em>Note: automatic personality scoring is not preserved in eXeLearning export.</em></p>`
    ]
      .filter(Boolean)
      .join("\n")
  };
}
