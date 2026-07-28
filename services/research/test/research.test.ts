import { describe, expect, it } from "vitest";
import { toResearchResult } from "../src/pipeline.js";

describe("toResearchResult (research over our own index)", () => {
  it("maps index hits into ranked web results", () => {
    const r = toResearchResult("open agents", "standard", [
      { id: "1", url: "https://site.test/", title: "Home", snippet: "Open infra…", score: 0.71 },
      { id: "2", url: "https://site.test/about", title: "About", snippet: "We build…", score: 0.4 },
    ]);
    expect(r.results).toEqual([
      { title: "Home", url: "https://site.test/", snippet: "Open infra…", score: 0.71 },
      { title: "About", url: "https://site.test/about", snippet: "We build…", score: 0.4 },
    ]);
    expect(r.summary).toContain("Found 2 results");
    // academic sources stay honest-empty seams
    expect(r.papers).toEqual([]);
    expect(r.patents).toEqual([]);
  });

  it("is honest when the index has nothing", () => {
    const r = toResearchResult("nothing here", "quick", []);
    expect(r.results).toEqual([]);
    expect(r.summary).toContain("No results");
    expect(r.summary).toContain("/index/crawl");
  });
});
