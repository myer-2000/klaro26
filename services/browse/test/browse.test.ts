import { describe, expect, it } from "vitest";
import { extractUrl, pageToBrowseResult } from "../src/pipeline.js";

describe("extractUrl", () => {
  it("finds a URL inside a task", () => {
    expect(extractUrl("Read https://acme.com/pricing and summarize")).toBe("https://acme.com/pricing");
  });
  it("returns null when there's no URL", () => {
    expect(extractUrl("Find the cheapest flight to Tokyo")).toBeNull();
  });
});

describe("pageToBrowseResult (real mapping)", () => {
  const html = "<html><head><title>Acme</title></head><body><article><h1>Hi</h1><p>Body text here.</p></article></body></html>";

  it("returns structured content with title and text", () => {
    const r = pageToBrowseResult("read it https://acme.com", "structured", "https://acme.com", html);
    expect(r.sources).toEqual(["https://acme.com"]);
    expect(r.steps[0]).toContain("fetched");
    expect(r.result).toMatchObject({ url: "https://acme.com", title: "Acme" });
    expect((r.result as { text: string }).text).toContain("Body text here.");
  });

  it("returns markdown when requested", () => {
    const r = pageToBrowseResult("t", "markdown", "https://acme.com", html);
    expect(r.result).toContain("# Hi");
  });
});
