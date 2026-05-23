export function slugify(input: string): string {
  return (
    input
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "item"
  );
}

let counter = 0;
export function uniqueId(prefix = "id"): string {
  counter = (counter + 1) & 0x7fffffff;
  const rand = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0");
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}-${rand}`;
}
