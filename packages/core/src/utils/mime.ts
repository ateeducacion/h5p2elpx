const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  mp4: "video/mp4",
  webm: "video/webm",
  ogv: "video/ogg",
  json: "application/json",
  xml: "application/xml",
  html: "text/html",
  htm: "text/html",
  txt: "text/plain",
  pdf: "application/pdf"
};

export function guessMime(filename: string): string | undefined {
  const ext = filename.toLowerCase().split(".").pop();
  if (!ext) return undefined;
  return MIME[ext];
}
