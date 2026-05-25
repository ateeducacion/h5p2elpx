/**
 * Many H5P question content types (H5P.Blanks, H5P.MultiChoice,
 * H5P.TrueFalse, H5P.DragText, H5P.Dictation, H5P.AdvancedBlanks,
 * H5P.MarkTheWords, H5P.Essay, …) share an optional intro media field —
 * `content.media.type` — that points at an H5P.Image / H5P.Audio / H5P.Video
 * authored alongside the question. The original H5P player renders it above
 * the question; we want the same in eXeLearning.
 *
 * This helper centralises the path/alt extraction so each adapter handles
 * the field identically.
 */
export type IntroMedia = { src: string; alt?: string };

export function extractIntroMedia(content: any): IntroMedia | undefined {
  const params = content?.media?.type?.params;
  const path = typeof params?.file?.path === "string" ? params.file.path : undefined;
  if (!path) return undefined;
  const alt =
    typeof params?.alt === "string"
      ? params.alt
      : typeof params?.contentName === "string"
        ? params.contentName
        : undefined;
  return { src: path, alt };
}
