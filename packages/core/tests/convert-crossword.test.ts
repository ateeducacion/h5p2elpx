import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { convert } from "../src/convert/convert.ts";
import { validateElpx } from "../src/exe/validate.ts";
import { makeH5pZip } from "./_helpers.ts";

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
    const result = await convert([
      { kind: "h5p-bytes", data: bytes, filename: "crossword.h5p" }
    ]);
    expect(result.report.summary.converted).toBe(1);
    expect(result.report.summary.unsupported).toBe(0);
    expect(result.report.activities[0].mappedTo).toContain("crossword");

    const validation = await validateElpx(result.elpx);
    expect(validation.ok).toBe(true);

    const zip = await JSZip.loadAsync(result.elpx);
    const xml = await zip.file("content.xml")!.async("string");
    expect(xml).toContain("<odeIdeviceTypeName>crossword</odeIdeviceTypeName>");
    expect(xml).toContain("crucigrama-DataGame");

    // The data blob is URI-encoded JSON; decode and inspect.
    const match = xml.match(/crucigrama-DataGame[^>]*>([^<]+)</);
    expect(match).not.toBeNull();
    const decoded = JSON.parse(decodeURIComponent(match![1]!));
    expect(decoded.typeGame).toBe("Crossword");
    expect(decoded.wordsGame).toHaveLength(2);
    expect(decoded.wordsGame[0].word).toBe("GATO");
    expect(decoded.wordsGame[0].definition).toBe("Felino doméstico");
  });
});
