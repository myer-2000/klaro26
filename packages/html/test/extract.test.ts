import { describe, expect, it } from "vitest";
import {
  detectContact,
  detectDocs,
  detectFaq,
  detectPricing,
  extractHeadings,
  extractLinks,
  extractText,
} from "@klaro26/html";

describe("extractHeadings", () => {
  it("returns level + text in document order", () => {
    expect(extractHeadings("<h1>A</h1><h3>B</h3>")).toEqual([
      { level: 1, text: "A" },
      { level: 3, text: "B" },
    ]);
  });
});

describe("extractLinks", () => {
  it("dedupes, skips anchors/js, and resolves against a base", () => {
    const html = `
      <a href="#x">skip</a>
      <a href="javascript:void(0)">skip</a>
      <a href="/docs">Docs</a>
      <a href="/docs">Docs again</a>
      <a href="https://ex.com/a">Abs</a>`;
    const links = extractLinks(html, "https://site.com/page");
    expect(links).toEqual([
      { href: "https://site.com/docs", text: "Docs" },
      { href: "https://ex.com/a", text: "Abs" },
    ]);
  });
});

describe("detectContact", () => {
  it("reads mailto and tel", () => {
    const html = `<a href="mailto:hi@acme.com">email</a><a href="tel:+1 555 123 4567">call</a>`;
    expect(detectContact(html)).toEqual({ email: "hi@acme.com", phone: "+1 555 123 4567" });
  });
  it("falls back to email in text", () => {
    expect(detectContact("<p>Reach us at sales@acme.com today</p>").email).toBe("sales@acme.com");
  });
});

describe("detectPricing", () => {
  it("finds amounts, currencies and periods", () => {
    const html = "<p>Pro plan is $49/mo. Enterprise costs £2,000/year.</p>";
    const prices = detectPricing(html);
    expect(prices[0]).toMatchObject({ amount: 49, currency: "USD", period: "mo" });
    expect(prices[1]).toMatchObject({ amount: 2000, currency: "GBP", period: "year" });
  });
});

describe("detectFaq", () => {
  it("reads <details>/<summary> pairs", () => {
    const html = "<details><summary>Is there a free tier?</summary>Yes, forever.</details>";
    expect(detectFaq(html)).toEqual([{ q: "Is there a free tier?", a: "Yes, forever." }]);
  });
  it("reads question headings followed by a paragraph", () => {
    const html = "<h3>Can I self-host?</h3><p>Yes, it's MIT.</p><h3>Not a question</h3><p>x</p>";
    expect(detectFaq(html)).toEqual([{ q: "Can I self-host?", a: "Yes, it's MIT." }]);
  });
});

describe("detectDocs", () => {
  it("picks links that look like docs", () => {
    const links = [
      { href: "https://x.com/about", text: "About" },
      { href: "https://x.com/docs", text: "Documentation" },
      { href: "https://x.com/api", text: "Reference" },
    ];
    expect(detectDocs(links)).toEqual(["https://x.com/docs", "https://x.com/api"]);
  });
});

describe("extractText", () => {
  it("returns plain text of the main content", () => {
    expect(extractText("<body><nav>menu</nav><p>Hello <b>world</b>.</p></body>")).toBe("Hello world.");
  });
});
