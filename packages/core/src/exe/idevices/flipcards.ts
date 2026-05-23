import type { ElpxIdevice } from "../model.ts";
import { newIdeviceId } from "../ids.ts";

export type FlipcardSide = {
  /** Text shown when face is up. */
  text?: string;
  /** Optional image URL (already rewritten via the html URL form). */
  image?: string;
};

export type FlipcardEntry = {
  front: FlipcardSide;
  back: FlipcardSide;
};

export type FlipcardsInput = {
  pageId: string;
  blockId: string;
  order: number;
  cards: FlipcardEntry[];
  title?: string;
  /** Optional intro text shown above the game */
  instructions?: string;
};

/**
 * Mirrors the `flipcards` iDevice (Pattern 2 — URI-encoded JSON in
 * hidden div), per `doc/elpx-format/idevices/patterns.md` and the entry
 * in `doc/elpx-format/idevices/catalog.md`. Game data lives inside a
 * `<div class="flipcards-DataGame js-hidden">…</div>` block; the runtime
 * decodes it on load.
 */
export function buildFlipcardsIdevice(input: FlipcardsInput): ElpxIdevice {
  const id = newIdeviceId();
  const gameData = {
    id,
    typeGame: "Flipcards",
    cards: input.cards
  };
  const dataEncoded = encodeURIComponent(JSON.stringify(gameData));

  const cardList = input.cards
    .map(
      (c, i) =>
        `    <li class="flipcard" data-card="${i}">` +
        `<div class="front">${renderSide(c.front)}</div>` +
        `<div class="back">${renderSide(c.back)}</div>` +
        `</li>`
    )
    .join("\n");

  const htmlView = [
    `<div class="flipcards-Container" id="${id}-container">`,
    `  <div class="flipcards-DataGame js-hidden" data-id="${id}">${dataEncoded}</div>`,
    input.instructions
      ? `  <div class="flipcards-Instructions">${input.instructions}</div>`
      : "",
    `  <ul class="flipcards-Cards">`,
    cardList,
    `  </ul>`,
    `</div>`
  ]
    .filter(Boolean)
    .join("\n");

  return {
    id,
    pageId: input.pageId,
    blockId: input.blockId,
    typeName: "flipcards",
    title: input.title ?? "Memory cards",
    htmlView,
    jsonProperties: { ideviceId: id, dataGame: dataEncoded },
    order: input.order,
    visibility: true
  };
}

function renderSide(side: FlipcardSide): string {
  const text = side.text ?? "";
  if (side.image) {
    return `<img src="${side.image}" alt="${escapeAttr(text)}" />${text ? `<p>${text}</p>` : ""}`;
  }
  return text;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
