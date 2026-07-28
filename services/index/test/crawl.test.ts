import { describe, expect, it } from "vitest";
import { crawl, robotsAllows, robotsDisallows, type FetchHtml } from "../src/crawl.js";
import { IndexStore } from "../src/store.js";

/* A fake same-origin site plus one external link — served without any network. */
const SITE: Record<string, string> = {
  "https://site.test/": `<html><head><title>Home</title></head><body>
    <h1>Klaro26</h1><p>Open source infrastructure for AI agents.</p>
    <a href="/about">About</a> <a href="/pricing">Pricing</a>
    <a href="https://external.test/x">External</a></body></html>`,
  "https://site.test/about": `<html><head><title>About</title></head><body>
    <p>We build open, self-hostable APIs.</p><a href="/">Home</a></body></html>`,
  "https://site.test/pricing": `<html><head><title>Pricing</title></head><body>
    <p>Free to self-host under MIT.</p></body></html>`,
};
const fakeFetch: FetchHtml = async (url) => SITE[url] ?? null;

describe("crawl (our own crawler)", () => {
  it("crawls same-origin pages and skips external links", async () => {
    const pages = await crawl(["https://site.test/"], { maxPages: 10 }, fakeFetch);
    const urls = pages.map((p) => p.url).sort();
    expect(urls).toEqual([
      "https://site.test/",
      "https://site.test/about",
      "https://site.test/pricing",
    ]);
    expect(urls.some((u) => u.includes("external"))).toBe(false);
  });

  it("respects the page budget", async () => {
    const pages = await crawl(["https://site.test/"], { maxPages: 2 }, fakeFetch);
    expect(pages).toHaveLength(2);
  });

  it("extracts clean title + text per page", async () => {
    const pages = await crawl(["https://site.test/"], {}, fakeFetch);
    const home = pages.find((p) => p.url === "https://site.test/")!;
    expect(home.title).toBe("Home");
    expect(home.text).toContain("Open source infrastructure for AI agents.");
  });
});

describe("robots.txt", () => {
  it("parses Disallow rules for * (and ignores other agents)", () => {
    const txt = "User-agent: *\nDisallow: /private\nDisallow: /tmp\n\nUser-agent: evilbot\nDisallow: /";
    expect(robotsDisallows(txt)).toEqual(["/private", "/tmp"]);
  });
  it("allows/denies by path prefix", () => {
    expect(robotsAllows(["/private"], "/private/x")).toBe(false);
    expect(robotsAllows(["/private"], "/public")).toBe(true);
  });
  it("skips disallowed pages while crawling", async () => {
    const site: Record<string, string> = {
      ...SITE,
      "https://site.test/robots.txt": "User-agent: *\nDisallow: /pricing",
    };
    const f: FetchHtml = async (u) => site[u] ?? null;
    const pages = await crawl(["https://site.test/"], {}, f);
    const urls = pages.map((p) => p.url);
    expect(urls).toContain("https://site.test/about");
    expect(urls).not.toContain("https://site.test/pricing");
  });
});

describe("depth", () => {
  it("maxDepth 0 fetches only the seed", async () => {
    const pages = await crawl(["https://site.test/"], { maxDepth: 0 }, fakeFetch);
    expect(pages.map((p) => p.url)).toEqual(["https://site.test/"]);
  });
});

describe("crawl → our index → our search (end to end, no third party)", () => {
  it("makes crawled pages searchable by meaning", async () => {
    const pages = await crawl(["https://site.test/"], {}, fakeFetch);
    const store = new IndexStore();
    for (const p of pages) store.index({ collection: "web", url: p.url, title: p.title, text: p.text });

    const hits = store.search("open source infrastructure for agents", "web", 3);
    expect(hits[0].title).toBe("Home");
    expect(hits[0].url).toBe("https://site.test/");
  });
});
