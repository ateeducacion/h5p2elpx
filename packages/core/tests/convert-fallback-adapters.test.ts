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
});
