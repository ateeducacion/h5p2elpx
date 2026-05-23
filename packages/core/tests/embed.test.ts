import { describe, expect, it } from "vitest";
import { buildVideoEmbed } from "../src/utils/embed.ts";

describe("buildVideoEmbed", () => {
  it("YouTube watch URL → iframe at /embed/<id>", () => {
    const html = buildVideoEmbed("https://www.youtube.com/watch?v=r3nqoR3RlJY");
    expect(html).toContain("<iframe");
    expect(html).toContain("https://www.youtube.com/embed/r3nqoR3RlJY");
    expect(html).toContain("allowfullscreen");
  });

  it("youtu.be short URL → iframe at /embed/<id>", () => {
    const html = buildVideoEmbed("https://youtu.be/r3nqoR3RlJY");
    expect(html).toContain("https://www.youtube.com/embed/r3nqoR3RlJY");
  });

  it("youtube.com/embed already-embed URL → iframe at /embed/<id>", () => {
    const html = buildVideoEmbed("https://www.youtube.com/embed/r3nqoR3RlJY");
    expect(html).toContain("https://www.youtube.com/embed/r3nqoR3RlJY");
  });

  it("Vimeo URL → iframe at player.vimeo.com", () => {
    const html = buildVideoEmbed("https://vimeo.com/123456789");
    expect(html).toContain("https://player.vimeo.com/video/123456789");
  });

  it("direct .mp4 URL → native <video controls>", () => {
    const html = buildVideoEmbed("https://example.com/clip.mp4");
    expect(html).toContain("<video controls");
    expect(html).toContain('src="https://example.com/clip.mp4"');
  });

  it("`{{context_path}}/clip.mp4` token → native <video controls>", () => {
    const html = buildVideoEmbed("{{context_path}}/clip.mp4");
    expect(html).toContain("<video controls");
    expect(html).toContain("{{context_path}}/clip.mp4");
  });

  it("empty src → empty string", () => {
    expect(buildVideoEmbed("")).toBe("");
  });
});
