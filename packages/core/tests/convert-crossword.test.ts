import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { convert } from "../src/convert/convert.ts";
import { validateElpx } from "../src/exe/validate.ts";
import { makeH5pZip } from "./_helpers.ts";

/**
 * Inverse of `packages/core/src/exe/encrypt.ts::encryptGameData`.
 * Used only in this test to read back the encrypted DataGame blob.
 */
function decryptGameData(encoded: string): string {
  const unescaped = unescape(encoded);
  return Array.from(unescaped)
    .map((c) => String.fromCharCode(c.charCodeAt(0) ^ 146))
    .join("");
}

describe("convert H5P.Crossword", () => {
  it("produces a crossword iDevice with the H5P words encoded in the data blob", async () => {
    const bytes = await makeH5pZip({
      title: "Animals",
      mainLibrary: "H5P.Crossword",
      content: {
        words: [
          { answer: "GATO", clue: "Felino doméstico" },
          { answer: "PERRO", clue: "Mejor amigo del hombre" }
        ]
      }
    });
    const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "crossword.h5p" }]);
    expect(result.report.summary.converted).toBe(1);
    expect(result.report.summary.unsupported).toBe(0);
    expect(result.report.activities[0]!.mappedTo).toContain("crossword");

    const validation = await validateElpx(result.elpx);
    expect(validation.ok).toBe(true);

    const zip = await JSZip.loadAsync(result.elpx);
    const xml = await zip.file("content.xml")!.async("string");
    expect(xml).toContain("<odeIdeviceTypeName>crossword</odeIdeviceTypeName>");
    expect(xml).toContain("crucigrama-DataGame");

    // The DataGame blob is XOR-encrypted (key 146) and wrapped with the
    // legacy JS `escape()` — see `src/exe/encrypt.ts`. Decrypt and inspect.
    const match = xml.match(/crucigrama-DataGame[^>]*>([^<]+)</);
    expect(match).not.toBeNull();
    const decoded = JSON.parse(decryptGameData(match![1]!));
    expect(decoded.typeGame).toBe("Crucigrama");
    expect(decoded.version).toBe(2);
    expect(decoded.itinerary).toBeDefined();
    expect(decoded.msgs).toBeDefined();
    expect(decoded.msgs.msgReply).toBe("Reply");
    expect(decoded.wordsGame).toHaveLength(2);
    // Words are uppercased so eXe's case-sensitive layout solver can
    // intersect them, and ordered longest-first so the half-split
    // gives the solver more anchor letters (see crossword.ts adapter).
    expect(decoded.wordsGame[0].word).toBe("PERRO");
    expect(decoded.wordsGame[0].definition).toBe("Mejor amigo del hombre");
    expect(decoded.wordsGame[1].word).toBe("GATO");
    expect(decoded.wordsGame[0].x).toBe(0);
    expect(decoded.wordsGame[0].percentageShow).toBeNull();
  });

  it("sanitizes answers that eXe would reject (whitespace, > 14 chars)", async () => {
    const bytes = await makeH5pZip({
      title: "Cities",
      mainLibrary: "H5P.Crossword",
      content: {
        words: [
          { answer: "New York", clue: "Statue of liberty is located in?" },
          { answer: "Antidisestablishmentarianism", clue: "Long word" }
        ]
      }
    });
    const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "crossword.h5p" }]);
    const zip = await JSZip.loadAsync(result.elpx);
    const xml = await zip.file("content.xml")!.async("string");
    const match = xml.match(/crucigrama-DataGame[^>]*>([^<]+)</);
    const decoded = JSON.parse(decryptGameData(match![1]!));
    // Length-desc order: the truncated 14-char word comes first.
    expect(decoded.wordsGame[0].word).toBe("ANTIDISESTABLI");
    expect(decoded.wordsGame[0].definition).toContain("Antidisestablishmentarianism");
    // Whitespace stripped + uppercased, original preserved in the clue.
    expect(decoded.wordsGame[1].word).toBe("NEWYORK");
    expect(decoded.wordsGame[1].definition).toContain("New York");
    // Every word must satisfy eXe's editor (≤ 14 chars, no whitespace)
    // AND the layout solver (uniform case so intersections match).
    for (const w of decoded.wordsGame) {
      expect(w.word.length).toBeLessThanOrEqual(14);
      expect(w.word).toMatch(/^[A-Z0-9]+$/);
    }
  });

  it("orders wordsGame longest-first so eXe's solver picks long anchors as verticals", async () => {
    // Mixed lengths in source order — match the five h5p.org sample words.
    const bytes = await makeH5pZip({
      title: "Where are those located?",
      mainLibrary: "H5P.Crossword",
      content: {
        words: [
          { answer: "New York", clue: "Statue of liberty is located in?" },
          { answer: "Agra", clue: "Taj Mahal is located in which city?" },
          { answer: "Paris", clue: "Eiffel Tower is located in?" },
          { answer: "Athens", clue: "Acropolis is located in?" },
          { answer: "Arizona", clue: "In which state is Grand Canyon located?" }
        ]
      }
    });
    const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "crossword.h5p" }]);
    const zip = await JSZip.loadAsync(result.elpx);
    const xml = await zip.file("content.xml")!.async("string");
    const match = xml.match(/crucigrama-DataGame[^>]*>([^<]+)</);
    const decoded = JSON.parse(decryptGameData(match![1]!));
    // Half-split sends the first ceil(5/2)=3 as verticals. We want
    // those to be the three longest: ARIZONA (7), NEWYORK (7),
    // ATHENS (6). Source order is preserved within the same length
    // (NEWYORK appeared before ARIZONA in source — but ARIZONA wins
    // the ordering because both are 7 chars and JavaScript's sort
    // is stable, so the first 7-char input stays first).
    const order = decoded.wordsGame.map((w: { word: string }) => w.word);
    expect(order).toEqual(["NEWYORK", "ARIZONA", "ATHENS", "PARIS", "AGRA"]);
  });
});
