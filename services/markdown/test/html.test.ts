import { describe, expect, it } from "vitest";
import { decodeEntities, extractMetadata, htmlToMarkdown } from "../src/html.js";
import { processMarkdown } from "../src/pipeline.js";

describe("decodeEntities", () => {
  it("decodes named and numeric entities", () => {
    expect(decodeEntities("a &amp; b &lt;c&gt; &#38; &#x2014;")).toBe("a & b <c> & —");
  });
});

describe("htmlToMarkdown", () => {
  it("converts headings", () => {
    expect(htmlToMarkdown("<h1>Title</h1><h2>Sub</h2>")).toBe("# Title\n\n## Sub");
  });

  it("converts paragraphs and inline emphasis", () => {
    const md = htmlToMarkdown("<p>Hello <strong>bold</strong> and <em>italic</em>.</p>");
    expect(md).toBe("Hello **bold** and *italic*.");
  });

  it("converts links and images", () => {
    expect(htmlToMarkdown('<p>See <a href="https://x.com">X</a>.</p>')).toBe("See [X](https://x.com).");
    expect(htmlToMarkdown('<img src="/a.png" alt="Logo">')).toBe("![Logo](/a.png)");
  });

  it("converts unordered and ordered lists", () => {
    expect(htmlToMarkdown("<ul><li>one</li><li>two</li></ul>")).toBe("- one\n- two");
    expect(htmlToMarkdown("<ol><li>first</li><li>second</li></ol>")).toBe("1. first\n2. second");
  });

  it("converts blockquotes and inline code", () => {
    expect(htmlToMarkdown("<blockquote>quoted</blockquote>")).toBe("> quoted");
    expect(htmlToMarkdown("<p>run <code>npm test</code></p>")).toBe("run `npm test`");
  });

  it("converts pre blocks to fences", () => {
    expect(htmlToMarkdown("<pre>const x = 1;\nconst y = 2;</pre>")).toBe(
      "```\nconst x = 1;\nconst y = 2;\n```",
    );
  });

  it("strips scripts, styles and nav chrome", () => {
    const html = `
      <head><title>t</title></head>
      <nav>menu links</nav>
      <script>alert('x')</script>
      <style>.a{}</style>
      <p>Real content.</p>
      <footer>copyright</footer>`;
    const md = htmlToMarkdown(html);
    expect(md).toBe("Real content.");
    expect(md).not.toContain("menu");
    expect(md).not.toContain("copyright");
  });

  it("prefers <article> content when present", () => {
    const html = "<body><div>sidebar junk</div><article><p>The story.</p></article></body>";
    expect(htmlToMarkdown(html)).toBe("The story.");
  });
});

describe("extractMetadata", () => {
  it("reads title, author and description", () => {
    const html = `
      <title>Fallback</title>
      <meta property="og:title" content="Real Title">
      <meta name="author" content="Ada">
      <meta name="description" content="A page.">`;
    expect(extractMetadata(html)).toEqual({
      title: "Real Title",
      author: "Ada",
      description: "A page.",
    });
  });

  it("falls back to <title> when no og:title", () => {
    expect(extractMetadata("<title>Just Title</title>")).toEqual({ title: "Just Title" });
  });
});

describe("processMarkdown (end to end, offline)", () => {
  it("converts supplied HTML and attaches source metadata", async () => {
    const html = `<html><head><title>Post</title><meta name="author" content="Ada"></head>
      <body><article><h1>Hello</h1><p>World of <a href="https://klaro26.dev">Klaro26</a>.</p></article></body></html>`;
    const out = await processMarkdown({ url: "https://www.example.com/post", html });
    expect(out.metadata.source).toBe("example.com");
    expect(out.metadata.title).toBe("Post");
    expect(out.metadata.author).toBe("Ada");
    expect(out.markdown).toContain("# Hello");
    expect(out.markdown).toContain("[Klaro26](https://klaro26.dev)");
  });

  it("returns one embedding vector per paragraph when requested", async () => {
    const html = "<p>First paragraph here.</p><p>Second paragraph here.</p>";
    const out = await processMarkdown({ url: "https://x.com", html, embeddings: true });
    expect(out.embeddings).toHaveLength(2);
    expect(out.embeddings![0]).toHaveLength(256);
  });
});
