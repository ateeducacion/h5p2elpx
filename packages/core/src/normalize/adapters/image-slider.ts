import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.ImageSlider";

/** H5P.ImageSlider content.json: { imageSlides: [ { imageSlide: { params: { image: { params: { file:{path} } } } } } ] } */
export function adapt(content: any): NormalizedNode {
  const slides: any[] = Array.isArray(content?.imageSlides) ? content.imageSlides : [];
  const items = slides
    .map((s, i) => {
      const path =
        s?.imageSlide?.params?.image?.params?.file?.path ?? s?.params?.image?.params?.file?.path;
      const alt = s?.imageSlide?.params?.image?.params?.alt ?? "";
      const caption =
        typeof s?.imageSlide?.params?.imageCaption === "string"
          ? s.imageSlide.params.imageCaption
          : "";
      return typeof path === "string"
        ? `<figure><img src="${path}" alt="${alt}" />${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`
        : `<p>(slide ${i + 1}: no image)</p>`;
    })
    .join("\n");
  return {
    id: uniqueId("isl"),
    sourceType: machineName,
    kind: "text",
    html: `<div class="h5p2elpx-slider">${items || "(empty)"}</div>`
  };
}
