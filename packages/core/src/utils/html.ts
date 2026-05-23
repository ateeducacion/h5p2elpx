const SAFE_PROTOCOL = /^(https?:|mailto:|tel:|#|\/|\.\.?\/|resources\/|content\/)/i;

export function sanitizeHtml(input: string): string {
  if (!input) return "";
  let out = input;
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  out = out.replace(/ on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  out = out.replace(
    /\s(href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
    (m, attr, q1, q2, q3) => {
      const val = q1 ?? q2 ?? q3 ?? "";
      if (val.startsWith("javascript:") || val.startsWith("data:text/html")) {
        return ` ${attr}="#"`;
      }
      return m;
    }
  );
  return out;
}

export function rewriteUrls(html: string, mapper: (src: string) => string): string {
  return html.replace(/\s(src|href|poster)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi, (m, attr, dq, sq) => {
    const orig = dq ?? sq ?? "";
    if (!orig || SAFE_PROTOCOL.test(orig)) {
      const remapped = mapper(orig);
      if (remapped === orig) return m;
      return ` ${attr}="${remapped}"`;
    }
    return ` ${attr}="${mapper(orig)}"`;
  });
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
