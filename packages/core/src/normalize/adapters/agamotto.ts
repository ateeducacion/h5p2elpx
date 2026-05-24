import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.Agamotto";

/** H5P.Agamotto content.json:
 *   { items: [ { image: { params: { file: { path }, alt? } }, description? } ] }
 *
 * For exactly two frames the natural eXe iDevice is `beforeafter` (image
 * slider). With more frames we fall back to a sequential text iDevice with
 * one `<figure>` per item — mirrors `H5P.ImageSlider`.
 */
function frame(item: any): { src: string; alt: string; caption: string } {
  const params = item?.image?.params ?? item?.image ?? {};
  const path =
    typeof params?.file?.path === "string"
      ? params.file.path
      : typeof params?.path === "string"
        ? params.path
        : "";
  const alt = typeof params?.alt === "string" ? params.alt : "";
  const caption = typeof item?.description === "string" ? item.description : "";
  return { src: path, alt, caption };
}

export function adapt(content: any): NormalizedNode {
  const items: any[] = Array.isArray(content?.items) ? content.items : [];
  const frames = items.map(frame).filter((f) => f.src);

  if (frames.length === 2) {
    const b = frames[0]!;
    const a = frames[1]!;
    return {
      id: uniqueId("ag"),
      sourceType: machineName,
      kind: "beforeafter",
      before: { src: b.src, alt: b.alt, label: b.caption || undefined },
      after: { src: a.src, alt: a.alt, label: a.caption || undefined }
    };
  }

  const html =
    frames.length === 0
      ? "<p>(empty Agamotto sequence)</p>"
      : frames
          .map(
            (f) =>
              `<figure><img src="${f.src}" alt="${f.alt}" />${f.caption ? `<figcaption>${f.caption}</figcaption>` : ""}</figure>`
          )
          .join("\n");
  return {
    id: uniqueId("ag"),
    sourceType: machineName,
    kind: "text",
    html: `<div class="h5p2elpx-agamotto">${html}</div>`
  };
}
