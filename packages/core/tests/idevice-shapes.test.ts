import { describe, it, expect } from "bun:test";
import {
  buildTextIdevice,
  buildTrueOrFalseIdevice,
  buildFormIdevice,
  buildFlipcardsIdevice,
  buildBeforeAfterIdevice,
  blanksToFill,
  newOdeId
} from "../src/index.ts";
import { buildMapIdevice } from "../src/exe/idevices/map.ts";
import { buildWordSearchIdevice } from "../src/exe/idevices/word-search.ts";
import { translateGameMessages } from "../src/exe/idevices/i18n/translate-game-messages.ts";

describe("game message translations", () => {
  it("uses the requested language and falls back to English", () => {
    const messages = { msgReply: "Reply", missing: "Not translated" };
    expect(translateGameMessages(messages, "es-ES")).toEqual({
      msgReply: "Responder",
      missing: "Not translated"
    });
    expect(translateGameMessages(messages, "unknown")).toEqual(messages);
    expect(translateGameMessages(messages, "fr").msgReply).not.toBe("Reply");
  });

  it("writes translated messages in each game format", () => {
    const common = { pageId: "p", blockId: "b", order: 0, language: "es" };
    const form = buildFormIdevice({ ...common, questions: [] });
    const trueFalse = buildTrueOrFalseIdevice({ ...common, questions: [] });
    expect((form.jsonProperties as any).msgs.msgCheck).not.toBe("Check");
    expect((trueFalse.jsonProperties as any).msgs.msgTrue).not.toBe("True");
    const games = [
      buildFlipcardsIdevice({ ...common, cards: [] }),
      buildBeforeAfterIdevice({ ...common, beforeSrc: "a", afterSrc: "b" }),
      buildMapIdevice({ ...common, imageUrl: "a", points: [] })
    ];
    for (const [index, game] of games.entries()) {
      const data = JSON.parse(game.htmlView.match(/-DataGame js-hidden"[^>]*>([^<]+)</)![1]!);
      expect(data.msgs.msgPlayStart).toBe(
        index === 2 ? "Pulsa aquí para empezar" : "Pulsa aquí para jugar"
      );
    }
    const wordSearch = buildWordSearchIdevice({ ...common, words: ["CAT"] });
    const encoded = wordSearch.htmlView.match(/sopa-DataGame js-hidden"[^>]*>([^<]+)</)![1]!;
    const data = JSON.parse(
      Array.from(unescape(encoded))
        .map((c) => String.fromCharCode(c.charCodeAt(0) ^ 146))
        .join("")
    );
    expect(data.msgs.msgReply).toBe("Responder");
  });
});

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
      pageId: "p",
      blockId: "b",
      order: 0,
      html: "<p>hi</p>"
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
      pageId: "p",
      blockId: "b",
      order: 0,
      questions: [{ question: "<p>The sky is blue</p>", solution: 1 }]
    });
    expect(idev.typeName).toBe("trueorfalse");
    const j = idev.jsonProperties as any;
    expect(j.typeGame).toBe("TrueOrFalse");
    expect(j.questionsGame).toHaveLength(1);
    expect(j.questionsGame[0].solution).toBe(1);
    expect(j.questionsGame[0].feedback).toBe("");
    expect(j.questionsGame[0].suggestion).toBe("");
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
      pageId: "p",
      blockId: "b",
      order: 0,
      questions: [
        {
          activityType: "selection",
          selectionType: "single",
          baseText: "Pick one",
          answers: [
            [false, "Wrong"],
            [true, "Right"]
          ]
        }
      ]
    });
    expect(idev.typeName).toBe("form");
    const q = (idev.jsonProperties as any).questionsData[0];
    expect(q.activityType).toBe("selection");
    expect(q.selectionType).toBe("single");
    expect(q.answers).toEqual([
      [false, "Wrong"],
      [true, "Right"]
    ]);
  });

  it("fill: blanksToFill converts *answer* markers to <u>answer</u> with answers[] populated", () => {
    const q = blanksToFill("The capital of France is *Paris*.");
    expect(q.activityType).toBe("fill");
    expect(q.baseText).toBe("The capital of France is <u>Paris</u>.");
    expect(q.answers).toEqual(["Paris"]);
  });
});

describe("flipcards iDevice", () => {
  it("emits the eXe runtime DataGame shape", () => {
    const idev = buildFlipcardsIdevice({
      pageId: "p",
      blockId: "b",
      order: 0,
      cards: [{ front: { text: "Q" }, back: { text: "A" } }]
    });
    expect(idev.typeName).toBe("flipcards");
    expect(idev.htmlView).toContain('class="flipcards-IDevice"');
    expect(idev.htmlView).toContain('class="flipcards-DataGame js-hidden"');
    const dataDiv = idev.htmlView.match(
      /<div class="flipcards-DataGame js-hidden"[^>]*>([^<]+)<\/div>/
    )![1]!;
    const decoded = JSON.parse(dataDiv);
    expect(decoded.typeGame).toBe("FlipCards");
    expect(decoded.cardsGame).toHaveLength(1);
    expect(decoded.cardsGame[0]).toMatchObject({
      type: 2,
      url: "",
      eText: "Q",
      urlBk: "",
      eTextBk: "A",
      audio: "",
      audioBk: ""
    });
  });
});

describe("beforeafter iDevice", () => {
  it("emits the eXe runtime DataGame shape", () => {
    const idev = buildBeforeAfterIdevice({
      pageId: "p",
      blockId: "b",
      order: 0,
      beforeSrc: "before.jpg",
      beforeLabel: "Before",
      afterSrc: "after.jpg",
      afterLabel: "After"
    });
    expect(idev.typeName).toBe("beforeafter");
    expect(idev.htmlView).toContain('class="beforeafter-IDevice"');
    expect(idev.htmlView).toContain('class="beforeafter-DataGame js-hidden"');
    const dataDiv = idev.htmlView.match(
      /<div class="beforeafter-DataGame js-hidden">([^<]+)<\/div>/
    )![1]!;
    const decoded = JSON.parse(dataDiv);
    expect(decoded.typeGame).toBe("BeforeAfter");
    expect(decoded.cardsGame).toHaveLength(1);
    expect(decoded.cardsGame[0]).toMatchObject({
      position: 50,
      vertical: false,
      url: "after.jpg",
      urlBk: "before.jpg",
      eText: "After",
      eTextBk: "Before"
    });
  });
});
