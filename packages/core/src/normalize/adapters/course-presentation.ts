import type { CpSlide, CpSlideElement, NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";
import { machineNameOnly } from "../../h5p/library-ref.ts";

export const machineName = "H5P.CoursePresentation";

/**
 * H5P CoursePresentation slides are 2D canvases: each element has
 * percent-based x/y/width/height, native `H5P.GoToSlide` hotspots, and
 * a layer order from the source array. eXeLearning has no slide-overlay
 * iDevice, so this adapter preserves the raw positioning and lets the
 * convert layer compose a single positioned-HTML iDevice per slide.
 */
export function adapt(content: any): NormalizedNode {
  const slides: any[] = Array.isArray(content?.presentation?.slides)
    ? content.presentation.slides
    : [];
  const normSlides: CpSlide[] = slides.map((slide, idx) => {
    const rawElements: any[] = Array.isArray(slide?.elements) ? slide.elements : [];
    const elements: CpSlideElement[] = [];
    rawElements.forEach((el, order) => {
      const x = num(el?.x);
      const y = num(el?.y);
      const w = num(el?.width);
      const h = num(el?.height);
      const invisible = el?.invisible === true || el?.backgroundOpacity === 0;
      const goTo = typeof el?.goToSlide === "number" ? el.goToSlide : null;
      const action = el?.action;
      const lib = machineNameOnly(typeof action?.library === "string" ? action.library : "");

      // Native CP navigation hotspot — no `action`/`library`.
      if (!action && goTo != null) {
        elements.push({
          x,
          y,
          w,
          h,
          order,
          invisible,
          payload: { kind: "goto", goToSlide: goTo }
        });
        return;
      }

      const params = action?.params ?? {};
      if (lib === "H5P.Image") {
        const path = typeof params?.file?.path === "string" ? params.file.path : "";
        const alt = typeof params?.alt === "string" ? params.alt : undefined;
        if (path) {
          elements.push({
            x,
            y,
            w,
            h,
            order,
            invisible,
            payload: { kind: "image", src: path, alt }
          });
        }
        return;
      }
      if (lib === "H5P.Text" || lib === "H5P.AdvancedText") {
        const html = typeof params?.text === "string" ? params.text : "";
        elements.push({
          x,
          y,
          w,
          h,
          order,
          invisible,
          payload: { kind: "html", html }
        });
        return;
      }
      if (lib === "H5P.Link") {
        const url =
          typeof params?.linkWidget?.protocol === "string"
            ? `${params.linkWidget.protocol}${params.linkWidget?.url ?? ""}`
            : typeof params?.title === "string"
              ? params.title
              : "";
        const label = typeof params?.title === "string" && params.title ? params.title : url;
        const html = url
          ? `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`
          : escapeHtml(label);
        elements.push({
          x,
          y,
          w,
          h,
          order,
          invisible,
          payload: { kind: "html", html }
        });
        return;
      }
      // Anything else (Video, MultiChoice, etc. inside a slide) — surface
      // a visible placeholder so the author knows something was here.
      elements.push({
        x,
        y,
        w,
        h,
        order,
        invisible,
        payload: { kind: "unsupported", library: lib || "unknown" }
      });
    });
    return {
      title: `Slide ${idx + 1}`,
      elements
    };
  });
  return {
    id: uniqueId("cp"),
    sourceType: machineName,
    kind: "course-presentation",
    slides: normSlides
  };
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
