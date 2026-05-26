import { describe, expect, it } from "vitest";
import { buildCpSlideHtml } from "../src/convert/cp-slide-html.ts";
import { adapt as adaptCoursePresentation } from "../src/normalize/adapters/course-presentation.ts";
import { adapt as adaptQuestionnaire } from "../src/normalize/adapters/questionnaire.ts";
import { adaptH5pSubContent } from "../src/normalize/adapters/index.ts";
import type {
  NormalizedCoursePresentationNode,
  NormalizedContainerNode,
  NormalizedQuestionNode
} from "../src/normalize/nodes.ts";

describe("visible export regressions", () => {
  it("renders supported Course Presentation subcontent instead of slide placeholders", () => {
    const adapted = adaptCoursePresentation({
      presentation: {
        slides: [
          {
            elements: [
              {
                x: 10,
                y: 10,
                width: 40,
                height: 30,
                action: {
                  library: "H5P.SingleChoiceSet 1.11",
                  params: {
                    choices: [{ question: "<p>Pick one</p>", answers: ["Right", "Wrong"] }]
                  }
                }
              }
            ]
          },
          {
            elements: [
              {
                x: 10,
                y: 10,
                width: 40,
                height: 30,
                action: {
                  library: "H5P.Blanks 1.14",
                  params: {
                    text: "<p>Fill the sentence.</p>",
                    questions: ["The capital is *Paris*."]
                  }
                }
              }
            ]
          },
          {
            elements: [
              {
                x: 10,
                y: 10,
                width: 50,
                height: 40,
                action: {
                  library: "H5P.Video 1.5",
                  params: {
                    sources: [{ path: "videos/demo.mp4" }]
                  }
                }
              }
            ]
          },
          {
            elements: [
              {
                x: 10,
                y: 10,
                width: 40,
                height: 40,
                action: {
                  library: "H5P.Summary 1.10",
                  params: {
                    summaries: [{ tip: "<p>Choose</p>", summary: ["Correct", "Wrong"] }]
                  }
                }
              }
            ]
          },
          {
            elements: [
              {
                x: 10,
                y: 10,
                width: 40,
                height: 30,
                action: {
                  library: "H5P.DragText 1.10",
                  params: {
                    taskDescription: "<p>Drag the words</p>",
                    textField: "The answer is *here*."
                  }
                }
              }
            ]
          },
          {
            elements: [
              {
                x: 10,
                y: 10,
                width: 40,
                height: 40,
                action: {
                  library: "H5P.MultiChoice 1.16",
                  params: {
                    question: "<p>Question</p>",
                    answers: [
                      { text: "<div>One</div>", correct: true },
                      { text: "<div>Two</div>", correct: false }
                    ]
                  }
                }
              }
            ]
          }
        ]
      }
    }) as NormalizedCoursePresentationNode;

    const html = adapted.slides
      .map((slide) => buildCpSlideHtml(slide, (src) => `CTX/${src}`))
      .join("\n");

    expect(adapted.slides.every((slide) => slide.elements[0]!.payload.kind === "node")).toBe(true);
    expect(html).not.toContain("Unsupported in slide");
    expect(html).toContain('type="radio"');
    expect(html).toContain("The capital is <u>Paris</u>.");
    expect(html).toContain("<video");
    expect(html).toContain("Drag the words");
    expect(html).toContain("Question");
  });

  it("normalizes Questionnaire object-style subcontent entries", () => {
    const adapted = adaptQuestionnaire({
      questionnaireElements: [
        {
          library: {
            library: "H5P.SimpleMultiChoice 1.1",
            params: {
              inputType: "checkbox",
              question: "Which berries?",
              alternatives: [{ text: "Blueberry" }, { text: "Raspberry" }]
            }
          }
        },
        {
          library: {
            library: "H5P.OpenEndedQuestion 1.0",
            params: {
              question: "Tell us more",
              placeholderText: "Start writing..."
            }
          }
        }
      ]
    }) as NormalizedContainerNode;

    expect(adapted.children).toHaveLength(2);
    expect(adapted.children[0]!.kind).toBe("question");
    expect((adapted.children[0] as NormalizedQuestionNode).selectionType).toBe("multiple");
    expect(adapted.children[1]!.kind).toBe("text");
  });

  it("supports real-world library aliases used by the sample batch", () => {
    expect(adaptH5pSubContent("H5P.InfoWall 1.0", { panels: [] }).kind).toBe("flipcards");
    expect(
      adaptH5pSubContent("H5P.ImageMultipleHotspotQuestion 1.0", {
        backgroundImageSettings: { path: "map.png" },
        hotspotSettings: { hotspot: [] }
      }).kind
    ).toBe("hotspot-map");
  });
});
