import { describe, expect, it } from "vitest";
import { parseVideoSource, processVideo } from "../src/pipeline.js";

describe("parseVideoSource (real, deterministic)", () => {
  it("parses a youtube watch URL", () => {
    expect(parseVideoSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      provider: "youtube",
      videoId: "dQw4w9WgXcQ",
      thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    });
  });
  it("parses youtu.be and /shorts and /embed forms", () => {
    expect(parseVideoSource("https://youtu.be/abc123XYZ_1").videoId).toBe("abc123XYZ_1");
    expect(parseVideoSource("https://youtube.com/shorts/SHORTID0001").videoId).toBe("SHORTID0001");
    expect(parseVideoSource("https://www.youtube.com/embed/EMBEDID0002").videoId).toBe("EMBEDID0002");
  });
  it("parses a vimeo URL", () => {
    const s = parseVideoSource("https://vimeo.com/123456789");
    expect(s.provider).toBe("vimeo");
    expect(s.videoId).toBe("123456789");
    expect(s.embedUrl).toBe("https://player.vimeo.com/video/123456789");
  });
  it("reports unknown providers without inventing an id", () => {
    const s = parseVideoSource("https://example.com/clip");
    expect(s.provider).toBe("example.com");
    expect(s.videoId).toBeNull();
  });
});

describe("processVideo", () => {
  it("returns the real source and an honest transcript seam", async () => {
    const out = await processVideo({ url: "https://youtu.be/abc123XYZ_1" });
    expect(out.source.videoId).toBe("abc123XYZ_1");
    expect(out.source.thumbnail).toContain("abc123XYZ_1");
    expect(out.transcript).toEqual([]);
    expect(out.summary).toContain("require an ASR");
  });
});
