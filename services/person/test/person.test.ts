import { describe, expect, it } from "vitest";
import { personFromWiki } from "../src/pipeline.js";

describe("personFromWiki (real mapping)", () => {
  it("maps a standard Wikipedia summary into a profile", () => {
    const p = personFromWiki("Ada Lovelace", {
      type: "standard",
      title: "Ada Lovelace",
      description: "English mathematician (1815–1852)",
      extract: "Augusta Ada King, Countess of Lovelace, was an English mathematician.",
      content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Ada_Lovelace" } },
    });
    expect(p.name).toBe("Ada Lovelace");
    expect(p.bio).toContain("English mathematician");
    expect(p.socials).toEqual({ wikipedia: "https://en.wikipedia.org/wiki/Ada_Lovelace" });
    expect(p.confidence).toBe(0.8);
  });

  it("returns an honest empty profile when nothing is found", () => {
    const p = personFromWiki("Nobody McNoexist", null);
    expect(p.confidence).toBe(0);
    expect(p.bio).toContain("No public profile");
    expect(p.socials).toEqual({});
  });

  it("does not resolve disambiguation pages", () => {
    const p = personFromWiki("John Smith", { type: "disambiguation", extract: "John Smith may refer to…" });
    expect(p.confidence).toBe(0);
  });
});
