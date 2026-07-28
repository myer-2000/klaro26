import { describe, expect, it } from "vitest";
import { parseArxivAtom } from "../src/pipeline.js";

const SAMPLE = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2301.12345v1</id>
    <published>2023-01-29T10:00:00Z</published>
    <title>Attention Is All You Need Again</title>
    <author><name>Alice Smith</name></author>
    <author><name>Bob Jones</name></author>
  </entry>
  <entry>
    <id>http://arxiv.org/abs/1706.03762v5</id>
    <published>2017-06-12T00:00:00Z</published>
    <title>Batteries &amp; Beyond</title>
    <author><name>Carol Lee</name></author>
  </entry>
</feed>`;

describe("parseArxivAtom (real parser)", () => {
  it("parses entries into papers with title, year, url and authors", () => {
    const papers = parseArxivAtom(SAMPLE);
    expect(papers).toHaveLength(2);
    expect(papers[0]).toEqual({
      title: "Attention Is All You Need Again",
      year: 2023,
      url: "http://arxiv.org/abs/2301.12345v1",
      authors: ["Alice Smith", "Bob Jones"],
    });
  });
  it("decodes HTML entities in titles", () => {
    expect(parseArxivAtom(SAMPLE)[1].title).toBe("Batteries & Beyond");
  });
  it("returns nothing for an empty feed", () => {
    expect(parseArxivAtom("<feed></feed>")).toEqual([]);
  });
});
