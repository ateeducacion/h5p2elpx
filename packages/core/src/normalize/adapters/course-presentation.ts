import type { NormalizedNode, NormalizedSlideNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";
import { adaptH5pSubContent } from "./index.ts";

export const machineName = "H5P.CoursePresentation";

export function adapt(content: any): NormalizedNode {
  const slides: any[] = Array.isArray(content?.presentation?.slides)
    ? content.presentation.slides
    : [];
  const normSlides: NormalizedSlideNode[] = slides.map((slide, idx) => {
    const elements: any[] = Array.isArray(slide?.elements) ? slide.elements : [];
    const children: NormalizedNode[] = [];
    for (const el of elements) {
      const action = el?.action;
      if (!action) continue;
      const machine = String(action.library ?? "").split(" ")[0];
      if (!machine) continue;
      children.push(adaptH5pSubContent(machine, action.params ?? {}));
    }
    return {
      id: uniqueId("slide"),
      sourceType: "H5P.CoursePresentation.Slide",
      title: `Slide ${idx + 1}`,
      kind: "slide",
      children
    };
  });
  return {
    id: uniqueId("cp"),
    sourceType: machineName,
    kind: "slide-deck",
    slides: normSlides
  };
}
