import { describe, it, expect } from "vitest";
import { convert } from "../src/convert/convert.ts";
import { makeH5pZip } from "./_helpers.ts";

type AnyIdevice = { typeName: string; jsonProperties: any; htmlView: string };

async function convertAndFlatten(input: {
  mainLibrary: string;
  content: unknown;
}): Promise<{ idevices: AnyIdevice[]; report: any }> {
  const bytes = await makeH5pZip({ mainLibrary: input.mainLibrary, content: input.content });
  const result = await convert([
    { kind: "h5p-bytes", data: bytes, filename: `${input.mainLibrary}.h5p` }
  ]);
  const idevices = result.project.pages.flatMap((p) =>
    p.blocks.flatMap((b) => b.iDevices as AnyIdevice[])
  );
  return { idevices, report: result.report };
}

function decodeFlipcards(idevice: AnyIdevice): any {
  const match = idevice.htmlView.match(/<div class="flipcards-DataGame js-hidden">([^<]+)<\/div>/);
  expect(match).not.toBeNull();
  return JSON.parse(match![1]!);
}

const PNG_1PX = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82
]);

describe("convert H5P.GuessTheAnswer", () => {
  it("emits a single-card flipcards iDevice with image + question on the front", async () => {
    const { idevices, report } = await convertAndFlatten({
      mainLibrary: "H5P.GuessTheAnswer",
      content: {
        image: { path: "images/animal.png", alt: "mystery animal" },
        taskDescription: "What animal is this?",
        solutionText: "An axolotl"
      }
    });
    expect(report.activities[0]!.mappedTo).toContain("flipcards");
    const fc = idevices.find((i) => i.typeName === "flipcards")!;
    const data = decodeFlipcards(fc);
    expect(data.typeGame).toBe("FlipCards");
    expect(data.cardsGame).toHaveLength(1);
    expect(data.cardsGame[0].url).toContain("animal.png");
    expect(data.cardsGame[0].alt).toBe("mystery animal");
    expect(data.cardsGame[0].eText).toContain("What animal is this?");
    expect(data.cardsGame[0].eTextBk).toBe("An axolotl");
  });

  it("rewrites image assets referenced inside flipcards content", async () => {
    const bytes = await makeH5pZip({
      mainLibrary: "H5P.GuessTheAnswer",
      content: {
        image: { path: "images/animal.png", alt: "mystery animal" },
        taskDescription: "What animal is this?",
        solutionText: "An axolotl"
      },
      extras: { "content/images/animal.png": PNG_1PX }
    });
    const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "guess.h5p" }]);
    const flat = result.project.pages.flatMap((p) => p.blocks.flatMap((b) => b.iDevices));
    const fc = flat.find((i) => i.typeName === "flipcards")!;
    const data = decodeFlipcards(fc);
    expect(data.cardsGame[0].url).toBe("{{context_path}}/animal.png");
    expect(
      result.project.resources.find((r) => r.path === "content/resources/animal.png")
    ).toBeDefined();
  });
});

describe("convert H5P.AdventCalendar", () => {
  it("emits one flipcard per door with the day on the front", async () => {
    const { idevices } = await convertAndFlatten({
      mainLibrary: "H5P.AdventCalendar",
      content: {
        doors: [
          { day: 1, content: { contentType: { params: { text: "<p>Day one</p>" } } } },
          { day: 2, content: { contentType: { params: { text: "<p>Day two</p>" } } } }
        ]
      }
    });

    describe("convert H5P.MemoryGame", () => {
      it("uses the memory runtime mode and rewrites card images", async () => {
        const bytes = await makeH5pZip({
          mainLibrary: "H5P.MemoryGame",
          content: {
            cards: [
              {
                description: "Berry",
                image: { path: "images/berry.jpg" }
              }
            ]
          },
          extras: { "content/images/berry.jpg": PNG_1PX }
        });
        const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "memory.h5p" }]);
        const flat = result.project.pages.flatMap((p) => p.blocks.flatMap((b) => b.iDevices));
        const fc = flat.find((i) => i.typeName === "flipcards")!;
        const data = decodeFlipcards(fc);
        expect(data.type).toBe(3);
        expect(data.cardsGame[0].url).toBe("{{context_path}}/berry.jpg");
      });
    });
    const fc = idevices.find((i) => i.typeName === "flipcards")!;
    const data = decodeFlipcards(fc);
    expect(data.cardsGame).toHaveLength(2);
    expect(data.cardsGame[0].eText).toBe("Day 1");
    expect(data.cardsGame[0].eTextBk).toContain("Day one");
  });
});

describe("convert H5P.InformationWall", () => {
  it("emits one flipcard per panel with title/info on front", async () => {
    const { idevices } = await convertAndFlatten({
      mainLibrary: "H5P.InformationWall",
      content: {
        panels: [
          {
            panelTitle: "Volcanoes",
            panelInformation: "They erupt",
            panelAddInformation: "Magma rises through fissures"
          },
          { panelTitle: "Earthquakes", panelInformation: "Tectonic plates move" }
        ]
      }
    });
    const fc = idevices.find((i) => i.typeName === "flipcards")!;
    const data = decodeFlipcards(fc);
    expect(data.cardsGame).toHaveLength(2);
    expect(data.cardsGame[0].eText).toContain("Volcanoes");
    expect(data.cardsGame[0].eText).toContain("They erupt");
    expect(data.cardsGame[0].eTextBk).toBe("Magma rises through fissures");
    expect(data.cardsGame[1].eTextBk).toBe("Tectonic plates move");
  });
});

describe("convert H5P.MultiMediaChoice", () => {
  it("maps to a form selection with single selectionType when one option is correct", async () => {
    const { idevices, report } = await convertAndFlatten({
      mainLibrary: "H5P.MultiMediaChoice",
      content: {
        question: "Pick the cat",
        options: [
          { media: { params: { file: { path: "images/cat.png" }, alt: "cat" } }, correct: true },
          { media: { params: { file: { path: "images/dog.png" }, alt: "dog" } }, correct: false }
        ]
      }
    });
    expect(report.activities[0]!.mappedTo).toContain("form(selection)");
    const form = idevices.find((i) => i.typeName === "form")!;
    const q = form.jsonProperties.questionsData[0];
    expect(q.activityType).toBe("selection");
    expect(q.selectionType).toBe("single");
    expect(q.baseText).toBe("Pick the cat");
    expect(q.answers[0]).toEqual([true, '<img src="images/cat.png" alt="cat" />']);
  });

  it("switches to multiple when more than one option is correct", async () => {
    const { idevices } = await convertAndFlatten({
      mainLibrary: "H5P.MultiMediaChoice",
      content: {
        question: "Pick every mammal",
        options: [
          { media: { params: { file: { path: "a.png" } } }, correct: true },
          { media: { params: { file: { path: "b.png" } } }, correct: true },
          { media: { params: { file: { path: "c.png" } } }, correct: false }
        ]
      }
    });
    const form = idevices.find((i) => i.typeName === "form")!;
    expect(form.jsonProperties.questionsData[0].selectionType).toBe("multiple");
  });

  it("rewrites option images when the H5P package contains the referenced files", async () => {
    const bytes = await makeH5pZip({
      mainLibrary: "H5P.MultiMediaChoice",
      content: {
        question: "Pick the cat",
        options: [
          { media: { params: { file: { path: "images/cat.png" }, alt: "cat" } }, correct: true },
          { media: { params: { file: { path: "images/dog.png" }, alt: "dog" } }, correct: false }
        ]
      },
      extras: {
        "content/images/cat.png": PNG_1PX,
        "content/images/dog.png": PNG_1PX
      }
    });
    const result = await convert([{ kind: "h5p-bytes", data: bytes, filename: "mmc.h5p" }]);
    const form = result.project.pages
      .flatMap((p) => p.blocks.flatMap((b) => b.iDevices as AnyIdevice[]))
      .find((i) => i.typeName === "form")!;
    const q = form.jsonProperties.questionsData[0];
    expect(q.answers[0]).toEqual([true, '<img src="{{context_path}}/cat.png" alt="cat" />']);
    expect(q.answers[1]).toEqual([false, '<img src="{{context_path}}/dog.png" alt="dog" />']);
  });
});

describe("convert H5P.ArithmeticQuiz", () => {
  it("expands the spec into a fixed set of multichoice questions", async () => {
    const { idevices } = await convertAndFlatten({
      mainLibrary: "H5P.ArithmeticQuiz",
      content: { arithmeticType: "addition", maxQuestions: 5 }
    });
    const forms = idevices.filter((i) => i.typeName === "form");
    expect(forms).toHaveLength(5);
    const first = forms[0]!.jsonProperties.questionsData[0];
    expect(first.activityType).toBe("selection");
    expect(first.baseText).toMatch(/^\d+ \+ \d+ = \?$/);
    const correctCount = first.answers.filter((a: [boolean, string]) => a[0]).length;
    expect(correctCount).toBe(1);
  });

  it("supports division by avoiding fractional answers", async () => {
    const { idevices } = await convertAndFlatten({
      mainLibrary: "H5P.ArithmeticQuiz",
      content: { arithmeticType: "division", maxQuestions: 3 }
    });
    const forms = idevices.filter((i) => i.typeName === "form");
    expect(forms).toHaveLength(3);
    for (const f of forms) {
      const prompt = f.jsonProperties.questionsData[0].baseText as string;
      expect(prompt).toMatch(/^\d+ ÷ \d+ = \?$/);
      const [a, , b] = prompt.replace(" = ?", "").split(" ");
      expect(Number(a) % Number(b)).toBe(0);
    }
  });
});

describe("convert H5P.AdvancedBlanks (Complex Fill the Blanks)", () => {
  it("rewrites [answer|alt] markers into the form (fill) iDevice", async () => {
    const { idevices, report } = await convertAndFlatten({
      mainLibrary: "H5P.AdvancedBlanks",
      content: {
        text: "<p>Read carefully.</p>",
        blanksList: [
          { clozeText: "The capital of France is [Paris|paris]." },
          { clozeText: "Water boils at [100|one hundred] degrees Celsius." }
        ]
      }
    });
    expect(report.activities[0]!.mappedTo).toContain("form(fill)");
    const form = idevices.find((i) => i.typeName === "form")!;
    const props = form.jsonProperties;
    expect(props.questionsData).toHaveLength(2);
    expect(props.questionsData[0].activityType).toBe("fill");
    expect(props.questionsData[0].baseText).toContain("Paris");
    expect(props.questionsData[0].baseText).not.toContain("[Paris");
  });
});

describe("convert H5P.Agamotto", () => {
  it("emits a beforeafter iDevice when there are exactly two frames", async () => {
    const { idevices, report } = await convertAndFlatten({
      mainLibrary: "H5P.Agamotto",
      content: {
        items: [
          {
            image: { params: { file: { path: "before.jpg" }, alt: "before" } },
            description: "before"
          },
          { image: { params: { file: { path: "after.jpg" }, alt: "after" } }, description: "after" }
        ]
      }
    });
    expect(report.activities[0]!.mappedTo).toContain("beforeafter");
    const ba = idevices.find((i) => i.typeName === "beforeafter")!;
    const match = ba.htmlView.match(/<div class="beforeafter-DataGame js-hidden">([^<]+)<\/div>/);
    expect(match).not.toBeNull();
    const data = JSON.parse(match![1]!);
    expect(data.cardsGame[0].urlBk).toContain("before.jpg");
    expect(data.cardsGame[0].url).toContain("after.jpg");
    expect(data.cardsGame[0].eTextBk).toBe("before");
    expect(data.cardsGame[0].eText).toBe("after");
  });

  it("falls back to a text iDevice with sequential figures for >2 frames", async () => {
    const { idevices } = await convertAndFlatten({
      mainLibrary: "H5P.Agamotto",
      content: {
        items: [
          { image: { params: { file: { path: "1.jpg" } } }, description: "one" },
          { image: { params: { file: { path: "2.jpg" } } }, description: "two" },
          { image: { params: { file: { path: "3.jpg" } } }, description: "three" }
        ]
      }
    });
    const text = idevices.find((i) => i.typeName === "text")!;
    const html = text.jsonProperties.textTextarea as string;
    expect(html).toContain("1.jpg");
    expect(html).toContain("2.jpg");
    expect(html).toContain("3.jpg");
  });
});

describe("convert H5P.ImageHotspots", () => {
  it("keeps popup text from direct content entries", async () => {
    const { idevices, report } = await convertAndFlatten({
      mainLibrary: "H5P.ImageHotspots",
      content: {
        image: { path: "images/house.jpg" },
        hotspots: [
          {
            position: { x: 42.8, y: 41.45 },
            content: [
              {
                params: { text: "<p>Solar panel</p>" },
                library: "H5P.Text 1.1"
              }
            ]
          }
        ]
      }
    });
    expect(report.activities[0]!.mappedTo).toContain("map");
    const map = idevices.find((i) => i.typeName === "map")!;
    const match = map.htmlView.match(/mapa-DataGame[^>]*>([^<]+)</);
    expect(match).not.toBeNull();
    const game = JSON.parse(match![1]!);
    expect(game.points[0].title).toBe("Solar panel");
    expect(game.points[0].type).toBe(2);
    expect(game.points[0].x).toBeCloseTo(0.428);
    expect(game.points[0].y).toBeCloseTo(0.4145);
    expect(game.points[0].slides[0].title).toBe("Solar panel");
    expect(game.points[0].eText).toBe("");
    expect(game.selectsGame).toMatchObject([
      { typeSelect: 0, numberOptions: 4, options: ["", "", "", ""] }
    ]);
    expect(game.order).toBe("");
    expect(map.htmlView).toContain('class="js-hidden mapa-LinkTextsPoints"');
    expect(map.htmlView).toContain("<p>Solar panel</p>");
  });
});

describe("convert H5P.GameMap", () => {
  it("maps stages to map markers parsed from the H5P telemetry string", async () => {
    const { idevices, report } = await convertAndFlatten({
      mainLibrary: "H5P.GameMap",
      content: {
        gamemapSteps: {
          backgroundImageSettings: { backgroundImage: { path: "images/world.jpg" } },
          gamemap: {
            elements: [
              { id: "1", label: "Volcano", telemetry: "20,30,5,5" },
              { id: "2", label: "Castle", telemetry: "70,80,4,4" }
            ]
          }
        }
      }
    });
    expect(report.activities[0]!.mappedTo).toContain("map");
    const map = idevices.find((i) => i.typeName === "map")!;
    const match = map.htmlView.match(/mapa-DataGame[^>]*>([^<]+)</);
    expect(match).not.toBeNull();
    const game = JSON.parse(match![1]!);
    expect(game.typeGame).toBe("Mapa");
    expect(game.url).toContain("world.jpg");
    expect(game.points).toHaveLength(2);
    const firstLabel = game.points[0].title || game.points[0].name || game.points[0].label || "";
    expect(firstLabel).toContain("Volcano");
  });
});
