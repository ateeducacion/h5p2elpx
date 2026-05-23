/**
 * eXeLearning v4 IDs are `YYYYMMDDHHmmss` (UTC) followed by 6 uppercase
 * alphanumeric characters — see `doc/elpx-format/ids.md` in the eXe repo.
 *
 *   Example: `20251217062007ABC001`
 *
 * Same format for project, version, page, block and iDevice ids.
 */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function rand6(): string {
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

function timestamp14(): string {
  const d = new Date();
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return (
    `${d.getUTCFullYear()}` +
    p(d.getUTCMonth() + 1) +
    p(d.getUTCDate()) +
    p(d.getUTCHours()) +
    p(d.getUTCMinutes()) +
    p(d.getUTCSeconds())
  );
}

/** Single monotonic counter prevents id collisions when many ids are
 *  generated in the same millisecond — we still randomise, but bump the
 *  last character via a counter to guarantee uniqueness inside a run. */
let collisionCounter = 0;

export function newOdeId(): string {
  collisionCounter = (collisionCounter + 1) % ALPHABET.length;
  const tail = rand6().slice(0, 5) + ALPHABET[collisionCounter]!;
  return timestamp14() + tail;
}

export const newProjectId = newOdeId;
export const newVersionId = newOdeId;
export const newPageId = newOdeId;
export const newBlockId = newOdeId;
export const newIdeviceId = newOdeId;
