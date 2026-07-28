/**
 * Runs every Klaro26 endpoint's REAL logic against sample inputs and writes the
 * actual outputs to results/ — one JSON file per endpoint plus a REPORT.md.
 *
 *   npx tsx scripts/demo.ts
 *
 * Everything here calls the genuine pipeline code (no mocks of our own logic),
 * using offline-friendly inputs (supplied HTML / text / URLs) so it runs with
 * zero network and zero third parties.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { processMarkdown } from "../services/markdown/src/pipeline.js";
import { processExtract } from "../services/extract/src/pipeline.js";
import { processDocument } from "../services/document/src/pipeline.js";
import { companyFromHtml } from "../services/company/src/pipeline.js";
import { parseVideoSource, processVideo } from "../services/video/src/pipeline.js";
import { personFromWiki } from "../services/person/src/pipeline.js";
import { extractUrl, pageToBrowseResult } from "../services/browse/src/pipeline.js";
import { toResearchResult } from "../services/research/src/pipeline.js";
import { MemoryStore } from "../services/memory/src/store.js";
import { IndexStore } from "../services/index/src/store.js";
import { crawl, type FetchHtml } from "../services/index/src/crawl.js";
import { RegistryStore } from "../services/registry/src/store.js";
import { SEED } from "../services/registry/src/seed.js";

const OUT = join(process.cwd(), "results");
mkdirSync(OUT, { recursive: true });

interface Case {
  endpoint: string;
  kind: "REAL" | "REAL (our own index)" | "REAL subset";
  request: unknown;
  response: unknown;
}
const cases: Case[] = [];
const add = (c: Case) => {
  cases.push(c);
  writeFileSync(join(OUT, `${c.endpoint.replace(/^\//, "").replace(/\//g, "_")}.json`), JSON.stringify(c, null, 2));
};

/* ---------- sample inputs ---------- */

const ARTICLE_HTML = `<html><head><title>Shipping the SDK</title><meta name="author" content="Myer">
<meta name="description" content="How we shipped the Klaro26 SDK."></head>
<body><nav>home about</nav>
<article><h1>Shipping the SDK</h1>
<p>We shipped <strong>@klaro26/sdk</strong> with <a href="https://npmjs.com">npm</a> support.</p>
<ul><li>ESM + CJS</li><li>Retries</li></ul>
<pre>npm i @klaro26/sdk</pre></article>
<footer>copyright</footer></body></html>`;

const COMPANY_HTML = `<html><head><title>Acme</title>
<meta name="description" content="Acme builds developer tools for AI teams.">
<script src="https://js.stripe.com/v3"></script><script src="/_next/static/x.js"></script></head>
<body><main><h2>Pricing</h2><p>Starter is $19/mo, Pro $49/mo, Enterprise from $2,000/year.</p>
<h3>Is there a free trial?</h3><p>Yes, 14 days.</p>
<a href="mailto:sales@acme.io">Sales</a> <a href="/developers/docs">API Docs</a></main></body></html>`;

const SITE: Record<string, string> = {
  "https://site.test/": `<html><head><title>Home</title></head><body><h1>Klaro26</h1>
    <p>Open source infrastructure for AI agents: clean structured data APIs.</p>
    <a href="/about">About</a> <a href="/pricing">Pricing</a></body></html>`,
  "https://site.test/about": `<html><head><title>About</title></head><body><p>We build open, self-hostable APIs.</p></body></html>`,
  "https://site.test/pricing": `<html><head><title>Pricing</title></head><body><p>Free to self-host under MIT.</p></body></html>`,
};
const fakeFetch: FetchHtml = async (u) => SITE[u] ?? null;

async function main() {
  /* /markdown */
  {
    const request = { url: "https://klaro26.dev/blog", html: ARTICLE_HTML, embeddings: true };
    add({ endpoint: "/markdown", kind: "REAL", request: { ...request, html: "<…article html…>" }, response: await processMarkdown(request) });
  }

  /* /extract */
  {
    const request = { url: "https://acme.io", html: COMPANY_HTML };
    add({ endpoint: "/extract", kind: "REAL", request: { ...request, html: "<…acme html…>" }, response: await processExtract(request) });
  }

  /* /document (3 formats) */
  {
    const html = await processDocument({ url: "x.html", content: ARTICLE_HTML });
    const csv = await processDocument({ content: "name,role,city\nAda,Engineer,London\nGrace,Scientist,NYC", type: "csv" });
    const md = await processDocument({ content: "# Onboarding\n\nWelcome.\n\n## Step 1\n\nInstall the SDK." });
    add({ endpoint: "/document", kind: "REAL", request: { formats: ["html", "csv", "markdown"] }, response: { html, csv, markdown: md } });
  }

  /* /company */
  {
    add({ endpoint: "/company", kind: "REAL", request: { name: "Acme", note: "extracts from the company's own site" }, response: companyFromHtml("Acme", "acme.io", COMPANY_HTML) });
  }

  /* /video */
  {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    add({ endpoint: "/video", kind: "REAL", request: { url }, response: { source: parseVideoSource(url), full: await processVideo({ url }) } });
  }

  /* /memory */
  {
    const mem = new MemoryStore();
    ["The user prefers dark mode and terse replies.", "The user is building Klaro26, an open API company.", "The user lives in Melbourne."]
      .forEach((text) => mem.remember({ text, namespace: "u1", metadata: {} }));
    add({ endpoint: "/memory", kind: "REAL", request: { query: "what is the user building?", namespace: "u1", k: 3 }, response: { matches: mem.recall("what is the user building?", "u1", 3) } });
  }

  /* /index + our crawler */
  {
    const pages = await crawl(["https://site.test/"], {}, fakeFetch);
    const store = new IndexStore();
    pages.forEach((p) => store.index({ collection: "web", url: p.url, title: p.title, text: p.text }));
    const hits = store.search("open source infrastructure for agents", "web", 3);
    add({ endpoint: "/index", kind: "REAL", request: { crawl: "https://site.test/", then_search: "open source infrastructure for agents" }, response: { crawled: pages.map((p) => p.url), hits } });

    /* /research runs on that same index */
    add({ endpoint: "/research", kind: "REAL (our own index)", request: { query: "open source infrastructure for agents", depth: "quick" }, response: toResearchResult("open source infrastructure for agents", "quick", hits) });
  }

  /* /registry */
  {
    const reg = new RegistryStore(SEED);
    add({ endpoint: "/registry", kind: "REAL", request: { search: "database" }, response: { hits: reg.search("database", 5) } });
  }

  /* /person (sample Wikipedia payload) */
  {
    const wiki = {
      type: "standard",
      title: "Ada Lovelace",
      description: "English mathematician (1815–1852)",
      extract: "Augusta Ada King, Countess of Lovelace, was an English mathematician and writer, chiefly known for her work on Charles Babbage's Analytical Engine.",
      content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Ada_Lovelace" } },
    };
    add({ endpoint: "/person", kind: "REAL", request: { name: "Ada Lovelace" }, response: personFromWiki("Ada Lovelace", wiki) });
  }

  /* /browse (task with a URL) */
  {
    const task = "Read https://acme.io and summarize the pricing";
    const url = extractUrl(task)!;
    add({ endpoint: "/browse", kind: "REAL subset", request: { task }, response: pageToBrowseResult(task, "structured", url, COMPANY_HTML) });
  }

  /* ---------- REPORT.md ---------- */
  const lines: string[] = [
    "# Klaro26 — live endpoint results",
    "",
    "Real output from every endpoint's actual pipeline code, run offline against sample inputs (no third parties).",
    "Generated by `npx tsx scripts/demo.ts`.",
    "",
    "| Endpoint | Kind | What you're seeing |",
    "| --- | --- | --- |",
    "| /markdown | REAL | HTML → clean Markdown + metadata + embeddings |",
    "| /extract | REAL | page → pricing, FAQ, contact, docs, products |",
    "| /document | REAL | HTML/CSV/Markdown → title, sections, tables |",
    "| /company | REAL | company site → summary, pricing, tech stack |",
    "| /video | REAL | URL → provider, id, thumbnail, embed |",
    "| /memory | REAL | write facts → semantic recall |",
    "| /index | REAL | our crawler → our index → semantic search |",
    "| /research | REAL (our own index) | query answered from our own index |",
    "| /registry | REAL | seeded MCP catalog search |",
    "| /person | REAL | Wikipedia summary → profile |",
    "| /browse | REAL subset | task w/ URL → fetch + extract |",
    "",
  ];
  for (const c of cases) {
    lines.push(`## ${c.endpoint} — ${c.kind}`, "", "**Request**", "", "```json", JSON.stringify(c.request, null, 2), "```", "", "**Response**", "", "```json", JSON.stringify(c.response, null, 2), "```", "");
  }
  writeFileSync(join(OUT, "REPORT.md"), lines.join("\n"));

  // eslint-disable-next-line no-console
  console.log(`Wrote ${cases.length} endpoint result files + REPORT.md to ${OUT}`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
