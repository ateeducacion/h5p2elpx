import { describe, it, expect } from "vitest";
import {
  buildTextIdevice,
  buildTrueOrFalseIdevice,
  buildFormIdevice,
  buildFlipcardsIdevice,
  blanksToFill,
  newOdeId
} from "../src/index.ts";

describe("ID format", () => {
  it("emits `YYYYMMDDHHmmss + 6 uppercase alphanumeric` as documented in doc/elpx-format/ids.md", () => {
    for (let i = 0; i < 50; i++) {
      const id = newOdeId();
      expect(id).toMatch(/^\d{14}[A-Z0-9]{6}$/);
    }
  });
});

describe("text iDevice shape", () => {
  it("wraps content in exe-text-template/textIdeviceContent and emits the eXe form fields", () => {
    const idev = buildTextIdevice({
      pageId: "p", blockId: "b", order: 0, html: "<p>hi</p>"
    });
    expect(idev.typeName).toBe("text");
    expect(idev.htmlView).toContain('class="exe-text-template"');
    expect(idev.htmlView).toContain('class="textIdeviceContent"');
    const j = idev.jsonProperties as any;
    expect(j.ideviceId).toBe(idev.id);
    expect(j.textTextarea).toBe("<p>hi</p>");
    expect(j.textInfoDurationTextInput).toBe("Duración");
    expect(j.textFeedbackInput).toBe("Mostrar retroalimentación");
  });
});

describe("trueorfalse iDevice shape", () => {
  it("emits typeGame, questionsGame and the 30 i18n msgs", () => {
    const idev = buildTrueOrFalseIdevice({
      pageId: "p", blockId: "b", order: 0,
      questions: [{ question: "<p>The sky is blue</p>", solution: 1 }]
    });
    expect(idev.typeName).toBe("trueorfalse");
    const j = idev.jsonProperties as any;
    expect(j.typeGame).toBe("TrueOrFalse");
    expect(j.questionsGame).toHaveLength(1);
    expect(j.questionsGame[0].solution).toBe(1);
    const msgKeys = Object.keys(j.msgs);
    expect(msgKeys.length).toBeGreaterThanOrEqual(30);
    for (const k of ["msgTrue", "msgFalse", "msgCheck", "msgReboot", "msgTypeGame"]) {
      expect(j.msgs[k]).toBeTruthy();
    }
  });
});

describe("form iDevice (selection + fill)", () => {
  it("selection: encodes answers as [boolean, label] tuples", () => {
    const idev = buildFormIdevice({
      pageId: "p", blockId: "b", order: 0,
      questions: [{
        activityType: "selection",
        selectionType: "single",
        baseText: "Pick one",
        answers: [[false, "Wrong"], [true, "Right"]]
      }]
    });
    expect(idev.typeName).toBe("form");
    const q = (idev.jsonProperties as any).questionsData[0];
    expect(q.activityType).toBe("selection");
    expect(q.selectionType).toBe("single");
    expect(q.answers).toEqual([[false, "Wrong"], [true, "Right"]]);
  });

  it("fill: blanksToFill converts *answer* markers to <u>answer</u> with answers[] populated", () => {
    const q = blanksToFill("The capital of France is *Paris*.");
    expect(q.activityType).toBe("fill");
    expect(q.baseText).toBe("The capital of France is <u>Paris</u>.");
    expect(q.answers).toEqual(["Paris"]);
  });
});

describe("flipcards iDevice (Pattern 2: URI-encoded JSON in hidden div)", () => {
  it("emits a flipcards-DataGame js-hidden div with URI-encoded JSON", () => {
    const idev = buildFlipcardsIdevice({
      pageId: "p", blockId: "b", order: 0,
      cards: [{ front: { text: "Q" }, back: { text: "A" } }]
    });
    expect(idev.typeName).toBe("flipcards");
    expect(idev.htmlView).toContain('class="flipcards-DataGame js-hidden"');
    const dataDiv = idev.htmlView.match(/<div class="flipcards-DataGame js-hidden"[^>]*>([^<]+)<\/div>/)![1]!;
    const decoded = JSON.parse(decodeURIComponent(dataDiv));
    expect(decoded.typeGame).toBe("Flipcards");
    expect(decoded.cards).toHaveLength(1);
  });
});
