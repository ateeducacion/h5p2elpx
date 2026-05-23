/**
 * Turn a video URL into the right HTML embed.
 *
 *   - YouTube URLs (`youtube.com/watch?v=…`, `youtu.be/…`, `youtube.com/embed/…`)
 *     and Vimeo URLs (`vimeo.com/<id>`) get an `<iframe>` pointed at their
 *     respective embed endpoints.
 *   - Anything else (direct `.mp4`/`.webm` URLs, internal eXe asset tokens,
 *     and the `{{context_path}}/…` form) is rendered as a native `<video controls>`.
 *
 * H5P stores YouTube/Vimeo references as `sources[0].path = <watch URL>`,
 * so the iframe path is essential — otherwise the embedded player is blank.
 */
export type EmbedOptions = {
  poster?: string;
  width?: number;
  height?: number;
};

const YT_PATTERNS = [
  /^https?:\/\/(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/i,
  /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([\w-]{11})/i,
  /^https?:\/\/youtu\.be\/([\w-]{11})/i
];

const VIMEO_PATTERN = /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/i;

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Returns `<video>` or `<iframe>` HTML for the given URL. */
export function buildVideoEmbed(src: string, opts: EmbedOptions = {}): string {
  if (!src) return "";
  const width = opts.width ?? 640;
  const height = opts.height ?? 360;

  for (const re of YT_PATTERNS) {
    const m = src.match(re);
    if (m) {
      const id = m[1];
      return (
        `<iframe width="${width}" height="${height}" ` +
        `src="https://www.youtube.com/embed/${id}" ` +
        `title="YouTube video" frameborder="0" ` +
        `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ` +
        `allowfullscreen></iframe>`
      );
    }
  }
  const v = src.match(VIMEO_PATTERN);
  if (v) {
    return (
      `<iframe width="${width}" height="${height}" ` +
      `src="https://player.vimeo.com/video/${v[1]}" ` +
      `title="Vimeo video" frameborder="0" ` +
      `allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`
    );
  }

  // Native HTML5 video for direct files or eXe `{{context_path}}/…` tokens.
  const posterAttr = opts.poster ? ` poster="${escapeAttr(opts.poster)}"` : "";
  return `<video controls width="${width}" src="${escapeAttr(src)}"${posterAttr}></video>`;
}
