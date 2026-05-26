import { describe, expect, it } from "vitest";
import { convert } from "../src/convert/convert.ts";
import { makeH5pZip } from "./_helpers.ts";

describe("fallback adapters with visible output", () => {
  it("maps H5P.AudioRecorder to a readable text iDevice", async () => {
    const bytes = await makeH5pZip({
      mainLibrary: "H5P.AudioRecorder",
      content: {
        title: "Count to five in French!",
        l10n: {
          statusReadyToRecord: "Press a button below to record your answer.",
          statusFinishedRecording: "You have successfully recorded your answer!"
        }
      }
    });
    const result = await convert([
      { kind: "h5p-bytes", data: bytes, filename: "audio-recorder.h5p" }
    ]);
    expect(result.report.summary.unsupported).toBe(0);
    const flat = result.project.pages.flatMap((p) => p.blocks.flatMap((b) => b.iDevices));
    const text = flat.find((i) => i.typeName === "text")!;
    expect(text.htmlView).toContain("Count to five in French!");
    expect(text.htmlView).toContain("Press a button below to record your answer.");
    expect(text.htmlView).toContain("live microphone recording is not preserved");
  });

  it("maps H5P.Chart to a readable table", async () => {
    const bytes = await makeH5pZip({
      mainLibrary: "H5P.Chart",
      content: {
        graphMode: "pieChart",
        figureDefinition: "Berry chart",
        listOfTypes: [
          { text: "Blueberries", value: 6 },
          { text: "Raspberries", value: 4 }
        ]
      }
    });
    const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "chart.h5p" }]);
    expect(result.report.summary.unsupported).toBe(0);
    const flat = result.project.pages.flatMap((p) => p.blocks.flatMap((b) => b.iDevices));
    const text = flat.find((i) => i.typeName === "text")!;
    expect(text.htmlView).toContain("Berry chart");
    expect(text.htmlView).toContain("Chart type: pieChart");
    expect(text.htmlView).toContain("<table>");
    expect(text.htmlView).toContain("Blueberries");
    expect(text.htmlView).toContain(">6<");
  });

  it("maps H5P.Timeline to a readable chronology", async () => {
    const bytes = await makeH5pZip({
      mainLibrary: "H5P.Timeline",
      content: {
        timeline: {
          headline: "History of strawberries",
          text: "<p>Intro paragraph</p>",
          date: [
            {
              startDate: "1700",
              endDate: "1800",
              headline: "New varieties in North America",
              text: "<p>Sweet berries</p>"
            }
          ]
        }
      }
    });
    const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "timeline.h5p" }]);
    expect(result.report.summary.unsupported).toBe(0);
    const flat = result.project.pages.flatMap((p) => p.blocks.flatMap((b) => b.iDevices));
    const text = flat.find((i) => i.typeName === "text")!;
    expect(text.htmlView).toContain("History of strawberries");
    expect(text.htmlView).toContain("Intro paragraph");
    expect(text.htmlView).toContain("1700 - 1800");
    expect(text.htmlView).toContain("New varieties in North America");
    expect(text.htmlView).toContain("Sweet berries");
  });

  it("maps H5P.PersonalityQuiz to readable questions and results", async () => {
    const bytes = await makeH5pZip({
      mainLibrary: "H5P.PersonalityQuiz",
      content: {
        titleScreen: {
          title: { text: "Which berry are you?" },
          image: { file: { path: "images/title.png" }, alt: "Berry banner" }
        },
        questions: [
          {
            text: "What color do you prefer?",
            answers: [
              { text: "Blue", personality: "blueberry" },
              { text: "Red", personality: "strawberry" }
            ]
          }
        ],
        personalities: [
          {
            name: "Strawberry",
            description: "Sweet and bright.",
            image: { file: { path: "images/strawberry.png" }, alt: "Strawberry" }
          }
        ]
      },
      extras: {
        "content/images/title.png": new Uint8Array([0]),
        "content/images/strawberry.png": new Uint8Array([0])
      }
    });
    const result = await convert([
      { kind: "h5p-bytes", data: bytes, filename: "personality-quiz.h5p" }
    ]);
    expect(result.report.summary.unsupported).toBe(0);
    const flat = result.project.pages.flatMap((p) => p.blocks.flatMap((b) => b.iDevices));
    const text = flat.find((i) => i.typeName === "text")!;
    expect(text.htmlView).toContain("Which berry are you?");
    expect(text.htmlView).toContain("What color do you prefer?");
    expect(text.htmlView).toContain("Matches: blueberry");
    expect(text.htmlView).toContain("Possible results");
    expect(text.htmlView).toContain("automatic personality scoring is not preserved");
    expect(text.htmlView).toContain("{{context_path}}/title.png");
    expect(text.htmlView).toContain("{{context_path}}/strawberry.png");
  });
});
